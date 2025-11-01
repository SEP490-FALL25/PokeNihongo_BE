import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { GachaBannerStatus } from '@/common/constants/shop-banner.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { GachaItemRateType } from '../gacha-item-rate/entities/gacha-item-rate.entity'
import { GachaItemType } from '../gacha-item/entities/gacha-item.entity'
import { PokemonType } from '../pokemon/entities/pokemon.entity'
import {
  CreateGachaBannerBodyType,
  GACHA_BANNER_FIELDS,
  GachaBannerType,
  UpdateGachaBannerBodyType
} from './entities/gacha-banner.entity'

type GachaBannerPrismaType = Omit<GachaBannerType, 'nameKey'> & { name: string }

@Injectable()
export class GachaBannerRepo {
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
      data: CreateGachaBannerBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<GachaBannerType> {
    const client = prismaTx || this.prismaService
    return client.gachaBanner.create({
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
      data: UpdateGachaBannerBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<GachaBannerType> {
    const client = prismaTx || this.prismaService
    return client.gachaBanner.update({
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
  ): Promise<GachaBannerType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.gachaBanner.delete({
          where: {
            id
          }
        })
      : await client.gachaBanner.update({
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

  async list(
    pagination: PaginationQueryType,
    langId?: number,
    isAllLang: boolean = false
  ) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, GACHA_BANNER_FIELDS)

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
      this.prismaService.gachaBanner.count({ where }),
      this.prismaService.gachaBanner.findMany({
        where,
        include: isAllLang
          ? {
              nameTranslations: {
                select: { value: true, languageId: true }
              }
            }
          : langId
            ? {
                nameTranslations: {
                  where: childNameIncludeWhere,
                  select: { value: true }
                }
              }
            : undefined,
        orderBy,
        skip,
        take
      })
    ])

    // Map results to include nameTranslation and exclude nameTranslations array
    const results = data.map((d: any) => {
      const { nameTranslations, ...rest } = d

      // Determine single translation for the requested langId.
      // If the included nameTranslations contain languageId, prefer the entry matching langId.
      // Otherwise fall back to the first item (the repository may return only { value } when
      // filtering by langId in the query).
      let single: string | undefined = undefined
      if (langId) {
        if (Array.isArray(nameTranslations) && nameTranslations.length > 0) {
          const first = nameTranslations[0]
          if (first && Object.prototype.hasOwnProperty.call(first, 'languageId')) {
            // items include languageId, find exact match
            const matched = nameTranslations.find((t: any) => t.languageId === langId)
            single = matched ? matched.value : d.nameKey
          } else {
            // items don't include languageId (likely only { value } were selected)
            single = nameTranslations[0]?.value ?? d.nameKey
          }
        } else {
          single = d.nameKey
        }
      }

      return {
        ...rest,
        ...(isAllLang ? { nameTranslations } : {}),
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

  async listwithDetail(pagination: PaginationQueryType, langId?: number) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, GACHA_BANNER_FIELDS)

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
      this.prismaService.gachaBanner.count({ where }),
      this.prismaService.gachaBanner.findMany({
        where,
        include: {
          // Always include all translations with languageId for service-level mapping
          nameTranslations: {
            select: { value: true, languageId: true }
          },
          items: {
            include: {
              pokemon: {
                include: {
                  types: true
                }
              },
              gachaItemRate: true
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

  findById(id: number): Promise<GachaBannerType | null> {
    return this.prismaService.gachaBanner.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByIdWithLangId(
    id: number,
    langId: number,
    isAllLang: boolean = false
  ): Promise<GachaBannerType | null> {
    return this.prismaService.gachaBanner.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: isAllLang
          ? { select: { value: true, languageId: true } }
          : { where: { languageId: langId }, select: { value: true, languageId: true } },
        items: {
          include: {
            gachaItemRate: {
              select: { rate: true, starType: true }
            },
            pokemon: {
              select: {
                id: true,
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
    const data = await this.prismaService.gachaBanner.findMany({
      where: {
        deletedAt: null,
        status: GachaBannerStatus.ACTIVE,
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
        items: {
          include: {
            gachaItemRate: true,
            pokemon: {
              select: {
                id: true,
                pokedex_number: true,
                nameJp: true,
                nameTranslations: true,
                imageUrl: true,
                rarity: true
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

  async countActiveBanners(excludeId?: number, prismaTx?: PrismaClient): Promise<number> {
    const client = prismaTx || this.prismaService
    return client.gachaBanner.count({
      where: {
        status: GachaBannerStatus.ACTIVE,
        deletedAt: null,
        ...(excludeId ? { id: { not: excludeId } } : {})
      }
    })
  }

  findByIdWithItemWithitemRate(id: number): Promise<
    | (GachaBannerType & {
        items: (GachaItemType & {
          gachaItemRate: GachaItemRateType
          pokemon: PokemonType
        })[]
      })
    | null
  > {
    return this.prismaService.gachaBanner.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        items: {
          include: {
            gachaItemRate: true,
            pokemon: true
          }
        }
      }
    })
  }
}
