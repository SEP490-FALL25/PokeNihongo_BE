import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { ShopBannerStatus } from '@/common/constants/shop-banner.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateShopBannerBodyType,
  REWARD_FIELDS,
  ShopBannerType,
  UpdateShopBannerBodyType
} from './entities/shop-banner.entity'

type ShopBannerPrismaType = Omit<ShopBannerType, 'nameKey'> & { name: string }

@Injectable()
export class ShopBannerRepo {
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
      data: CreateShopBannerBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<ShopBannerType> {
    const client = prismaTx || this.prismaService
    return client.shopBanner.create({
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
      data: UpdateShopBannerBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<ShopBannerType> {
    const client = prismaTx || this.prismaService
    return client.shopBanner.update({
      where: { id, deletedAt: null },
      data: {
        ...data,
        updatedById
      }
    })
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
  ): Promise<ShopBannerType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.shopBanner.delete({
          where: {
            id
          }
        })
      : await client.shopBanner.update({
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

  async list(pagination: PaginationQueryType, langId?: number) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, REWARD_FIELDS)

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
      this.prismaService.shopBanner.count({ where }),
      this.prismaService.shopBanner.findMany({
        where,
        include: {
          nameTranslations: langId
            ? {
                where: childNameIncludeWhere,
                select: { value: true }
              }
            : undefined
        },
        orderBy,
        skip,
        take
      })
    ])

    // Map results to include nameTranslation and exclude nameTranslations array
    const results = data.map((d: any) => {
      const { nameTranslations, ...rest } = d
      return {
        ...rest,
        nameTranslation: langId ? (nameTranslations?.[0]?.value ?? d.nameKey) : undefined
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

  async listwithDetail(pagination: PaginationQueryType, langId?: number) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, REWARD_FIELDS)

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
      this.prismaService.shopBanner.count({ where }),
      this.prismaService.shopBanner.findMany({
        where,
        include: {
          // Always include all translations with languageId for service-level mapping
          nameTranslations: {
            select: { value: true, languageId: true }
          },
          shopItems: {
            where: { deletedAt: null, isActive: true },
            include: {
              pokemon: true
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

  findById(id: number): Promise<ShopBannerType | null> {
    return this.prismaService.shopBanner.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByIdWithLangId(id: number, langId: number): Promise<ShopBannerType | null> {
    return this.prismaService.shopBanner.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: {
          where: {
            languageId: langId
          }
        },
        shopItems: {
          where: { deletedAt: null, isActive: true },
          include: {
            pokemon: {
              select: {
                pokedex_number: true,
                nameJp: true,
                nameTranslations: true,
                imageUrl: true,
                rarity: true
              }
            }
          }
        }
      }
    })
  }

  async findValidByDateWithLangId(date: Date, langId: number): Promise<Array<any>> {
    const data = await this.prismaService.shopBanner.findMany({
      where: {
        deletedAt: null,
        status: ShopBannerStatus.ACTIVE,
        AND: [
          {
            OR: [{ startDate: null }, { startDate: { lte: date } }]
          },
          {
            OR: [{ endDate: null }, { endDate: { gte: date } }]
          }
        ]
      },
      include: {
        nameTranslations: {
          where: { languageId: langId },
          select: { value: true }
        },
        shopItems: {
          where: { deletedAt: null, isActive: true },
          include: {
            pokemon: {
              include: {
                previousPokemons: {
                  select: { id: true }
                }
              }
            }
          }
        }
      },
      orderBy: { id: 'asc' }
    })

    return data.map((d: any) => ({
      ...d,
      nameTranslation: d.nameTranslations?.[0]?.value ?? d.nameKey
    }))
  }

  /**
   * Lấy thông tin shop banner để validate
   */
  async findByIdForValidation(shopBannerId: number): Promise<ShopBannerType | null> {
    return this.prismaService.shopBanner.findUnique({
      where: { id: shopBannerId },
      select: {
        id: true,
        nameKey: true,
        startDate: true,
        endDate: true,
        status: true,
        enablePrecreate: true,
        precreateBeforeEndDays: true,
        isRandomItemAgain: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        min: true,
        max: true,
        createdById: true,
        deletedById: true,
        updatedById: true
      }
    })
  }
}
