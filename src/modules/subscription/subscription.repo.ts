import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateTranslationBodyType } from '../translation/entities/translation.entities'
import {
  CreateSubscriptionBodyType,
  LEADERBOARD_SEASON_FIELDS,
  SubscriptionType,
  UpdateSubscriptionBodyType
} from './entities/subscription.entity'

type SubscriptionPrismaType = Omit<SubscriptionType, 'nameKey'> & {
  name: string
}

@Injectable()
export class SubscriptionRepo {
  constructor(private prismaService: PrismaService) {}

  // Wrapper cho transaction
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }

  create(
    {
      createdById,
      data
    }: {
      createdById: number | null
      data: CreateSubscriptionBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<SubscriptionType> {
    const client = prismaTx || this.prismaService
    return client.subscription.create({
      data: {
        ...data,
        createdById
      }
    })
  }

  async update(
    {
      id,
      updatedById,
      data
    }: {
      id: number
      updatedById?: number
      data: UpdateSubscriptionBodyType & {
        nameTranslations?: CreateTranslationBodyType[]
        subscriptionNameKey?: string
        descriptionTranslations?: CreateTranslationBodyType[]
        subscriptionDescriptionKey?: string
      }
    },
    prismaTx?: PrismaClient
  ): Promise<SubscriptionType> {
    const client = prismaTx || this.prismaService
    const {
      nameTranslations,
      subscriptionNameKey,
      descriptionTranslations,
      subscriptionDescriptionKey,
      ...subscriptionData
    } = data

    const updatedSubscription = await client.subscription.update({
      where: { id, deletedAt: null },
      data: {
        ...subscriptionData,
        updatedById
      }
    })

    // Upsert nameTranslations if provided
    if (nameTranslations && subscriptionNameKey) {
      await Promise.all(
        nameTranslations.map((tr) =>
          client.translation.upsert({
            where: {
              languageId_key: {
                languageId: tr.languageId,
                key: subscriptionNameKey
              }
            },
            create: {
              languageId: tr.languageId,
              key: subscriptionNameKey,
              value: tr.value,
              subscriptionNameKey
            },
            update: {
              value: tr.value
            }
          })
        )
      )
    }

    // Upsert descriptionTranslations if provided
    if (descriptionTranslations && subscriptionDescriptionKey) {
      await Promise.all(
        descriptionTranslations.map((tr) =>
          client.translation.upsert({
            where: {
              languageId_key: {
                languageId: tr.languageId,
                key: subscriptionDescriptionKey
              }
            },
            create: {
              languageId: tr.languageId,
              key: subscriptionDescriptionKey,
              value: tr.value,
              subscriptionDescriptionKey
            },
            update: {
              value: tr.value
            }
          })
        )
      )
    }

    return updatedSubscription
  }

  async delete(
    {
      id,
      deletedById
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<SubscriptionType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.subscription.delete({
          where: {
            id
          }
        })
      : await client.subscription.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date(),
            deletedById
          }
        })
    return result
  }

  async list(pagination: PaginationQueryType, langId?: number, isAdmin: boolean = false) {
    const { where: rawWhere = {}, orderBy } = parseQs(
      pagination.qs,
      LEADERBOARD_SEASON_FIELDS
    )

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Build base where
    const where: any = { deletedAt: null, ...rawWhere }

    // Support filtering by nameTranslation/nameTranslations via relational filter
    const nameFilterRaw =
      (rawWhere as any).nameTranslation ?? (rawWhere as any).nameTranslations
    let childNameIncludeWhere: any = {}
    if (nameFilterRaw && langId) {
      const toContainsFilter = (raw: any) => {
        if (typeof raw === 'object' && raw !== null) {
          const val =
            (raw as any).has ?? (raw as any).contains ?? (raw as any).equals ?? raw
          return { contains: String(val), mode: 'insensitive' as const }
        }
        return { contains: String(raw), mode: 'insensitive' as const }
      }
      const searchFilter = toContainsFilter(nameFilterRaw)
      delete (where as any).nameTranslation
      delete (where as any).nameTranslations
      where.nameTranslations = {
        some: {
          languageId: langId,
          value: searchFilter
        }
      }
      childNameIncludeWhere = { languageId: langId, value: searchFilter }
    } else if (langId) {
      childNameIncludeWhere = { languageId: langId }
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.subscription.count({ where }),
      this.prismaService.subscription.findMany({
        where,
        include: {
          // Always include all translations with languageId for service-level mapping
          nameTranslations: {
            select: { value: true, languageId: true }
          },
          features: {
            select: {
              id: true,
              featureKey: true,
              value: true
            }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    // Map results to include nameTranslation and exclude nameTranslations array
    const results = data.map((d: any) => {
      const { nameTranslations, ...rest } = d
      // Find single translation for current langId if provided
      const single = langId
        ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
          d.nameKey)
        : undefined
      return {
        ...rest,
        nameTranslations, // keep raw translations for service to format to all languages
        nameTranslation: single
      }
    })

    return {
      results,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }
  findById(id: number): Promise<SubscriptionType | null> {
    return this.prismaService.subscription.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByIdWithLangId(
    id: number,
    isAllLang: boolean,
    langId: number
  ): Promise<SubscriptionType | null> {
    return this.prismaService.subscription.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: isAllLang
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } },
        features: {
          select: {
            id: true,
            featureKey: true,
            value: true
          }
        }
      }
    })
  }

  findByIdWithAllLang(id: number) {
    return this.prismaService.subscription.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: {
          select: { id: true, languageId: true, key: true, value: true }
        }
      }
    })
  }
}
