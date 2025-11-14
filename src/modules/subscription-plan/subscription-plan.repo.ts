import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateSubscriptionPlanBodyType,
  SubscriptionPlanType,
  USER_GACHA_PITY_FIELDS,
  UpdateSubscriptionPlanBodyType
} from './entities/subscription-plan.entity'

@Injectable()
export class SubscriptionPlanRepo {
  constructor(private prismaService: PrismaService) {}
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }
  create(
    {
      createdById,
      data
    }: {
      createdById: number
      data: CreateSubscriptionPlanBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<SubscriptionPlanType> {
    const client = prismaTx || this.prismaService
    return client.subscriptionPlan.create({
      data: {
        ...data,
        createdById
      }
    })
  }

  update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateSubscriptionPlanBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<SubscriptionPlanType> {
    const client = prismaTx || this.prismaService
    return client.subscriptionPlan.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data
      }
    })
  }

  delete(
    id: number,
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<SubscriptionPlanType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.subscriptionPlan.delete({
          where: { id }
        })
      : client.subscriptionPlan.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async list(pagination: PaginationQueryType, langId?: number) {
    const { where, orderBy } = parseQs(pagination.qs, USER_GACHA_PITY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.subscriptionPlan.count({
        where: filterWhere
      }),
      this.prismaService.subscriptionPlan.findMany({
        where: filterWhere,
        include: {
          subscription: {
            include: {
              nameTranslations: {
                select: { value: true, languageId: true }
              },
              descriptionTranslations: {
                select: { value: true, languageId: true }
              }
            }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    // Map results to include subscription nameTranslation and descriptionTranslation
    const results = data.map((d: any) => {
      const { subscription, ...rest } = d
      if (!subscription) return d

      const { nameTranslations, descriptionTranslations, ...subRest } = subscription

      // Find single translation for current langId if provided
      const nameTranslation = langId
        ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
          subscription.nameKey)
        : subscription.nameKey

      const descriptionTranslation = langId
        ? (descriptionTranslations?.find((t: any) => t.languageId === langId)?.value ??
          subscription.descriptionKey)
        : subscription.descriptionKey

      return {
        ...rest,
        subscription: {
          ...subRest,
          nameTranslations, // keep for service-level conversion
          descriptionTranslations, // keep for service-level conversion
          nameTranslation,
          descriptionTranslation
        }
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

  async findById(id: number, langId?: number): Promise<any | null> {
    const plan = await this.prismaService.subscriptionPlan.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        subscription: {
          include: {
            nameTranslations: {
              select: { value: true, languageId: true }
            },
            descriptionTranslations: {
              select: { value: true, languageId: true }
            },
            features: {
              select: {
                id: true,

                value: true
              }
            }
          }
        }
      }
    })

    if (!plan) return null

    const { subscription, ...rest } = plan as any
    if (!subscription) return plan

    const { nameTranslations, descriptionTranslations, ...subRest } = subscription

    // Find single translation for current langId if provided
    const nameTranslation = langId
      ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
        subscription.nameKey)
      : subscription.nameKey

    const descriptionTranslation = langId
      ? (descriptionTranslations?.find((t: any) => t.languageId === langId)?.value ??
        subscription.descriptionKey)
      : subscription.descriptionKey

    return {
      ...rest,
      subscription: {
        ...subRest,
        nameTranslations, // keep for service-level conversion
        descriptionTranslations, // keep for service-level conversion
        nameTranslation,
        descriptionTranslation
      }
    }
  }
}
