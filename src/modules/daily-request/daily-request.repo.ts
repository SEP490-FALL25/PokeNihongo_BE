import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

// conditionType was replaced by dailyRequestCategoryId (foreign key to DailyRequestCategory)
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateDailyRequestBodyType,
  DAILY_REQUEST_FIELDS,
  DailyRequestType,
  UpdateDailyRequestBodyType
} from './entities/daily-request.entity'

export type WhereDailyRequestType = {
  id?: number
}

@Injectable()
export class DailyRequestRepo {
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
      data: CreateDailyRequestBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<DailyRequestType> {
    const client = prismaTx || this.prismaService
    return client.dailyRequest.create({
      data: {
        ...data,
        createdById
      }
    })
  }

  update(
    {
      id,
      updatedById,
      data
    }: {
      id: number
      updatedById?: number
      data: UpdateDailyRequestBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<DailyRequestType> {
    const client = prismaTx || this.prismaService
    return client.dailyRequest.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data,
        updatedById
      }
    })
  }

  delete(
    {
      id,
      deletedById
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<DailyRequestType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? this.prismaService.dailyRequest.delete({
          where: {
            id
          }
        })
      : this.prismaService.dailyRequest.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date(),
            deletedById
          }
        })
  }

  async list(pagination: PaginationQueryType, langId: number) {
    // --- 1. Parse QS bình thường ---
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, DAILY_REQUEST_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // --- 2. Xử lý filter nameTranslation và descriptionTranslation ---
    let nameKeys: string[] | undefined
    let descriptionKeys: string[] | undefined

    if (rawWhere.nameTranslation) {
      // Nếu rawWhere.nameTranslation là object { contains, mode }
      const searchValue =
        typeof rawWhere.nameTranslation === 'object'
          ? rawWhere.nameTranslation.contains
          : rawWhere.nameTranslation

      const translations = await this.prismaService.translation.findMany({
        where: {
          languageId: langId, // từ param
          value: {
            contains: searchValue,
            mode: 'insensitive'
          }
        },
        select: { key: true }
      })

      nameKeys = translations.map((t) => t.key)
      delete rawWhere.nameTranslation
    }

    if (rawWhere.descriptionTranslation) {
      const searchValue =
        typeof rawWhere.descriptionTranslation === 'object'
          ? rawWhere.descriptionTranslation.contains
          : rawWhere.descriptionTranslation

      const translations = await this.prismaService.translation.findMany({
        where: {
          languageId: langId,
          value: {
            contains: searchValue,
            mode: 'insensitive'
          }
        },
        select: { key: true }
      })

      descriptionKeys = translations.map((t) => t.key)
      delete rawWhere.descriptionTranslation
    }

    // --- 3. Build final where ---
    const where: any = {
      deletedAt: null,
      ...rawWhere,
      ...(nameKeys ? { nameKey: { in: nameKeys } } : {}),
      ...(descriptionKeys ? { descriptionKey: { in: descriptionKeys } } : {})
    }

    // --- 4. Query tổng số + data ---
    const [totalItems, data] = await Promise.all([
      this.prismaService.dailyRequest.count({ where }),
      this.prismaService.dailyRequest.findMany({
        where,
        orderBy,
        skip,
        take
      })
    ])

    // --- 5. Include nameTranslation và descriptionTranslation ---
    const allKeys = Array.from(
      new Set(data.flatMap((d) => [d.nameKey, (d as any).descriptionKey]))
    )

    const translations = await this.prismaService.translation.findMany({
      where: {
        key: { in: allKeys },
        languageId: langId // dùng langId từ param
      },
      select: { key: true, value: true }
    })

    const results = data.map((d) => ({
      ...d,
      nameTranslation: translations.find((t) => t.key === d.nameKey)?.value || d.nameKey,
      descriptionTranslation:
        translations.find((t) => t.key === (d as any).descriptionKey)?.value ||
        (d as any).descriptionKey
    }))

    // --- 6. Trả kết quả ---
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

  findById(id: number): Promise<DailyRequestType | null> {
    return this.prismaService.dailyRequest.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        reward: {
          select: {
            id: true,
            name: true,
            rewardItem: true,
            rewardTarget: true,
            rewardType: true
          }
        }
      }
    })
  }
  checkDailyRequestIsStreak(id: number): Promise<boolean> {
    // Return true if the daily request has isStreak = true
    return this.prismaService.dailyRequest
      .findUnique({
        where: {
          id,
          deletedAt: null
        },
        select: {
          isStreak: true
        }
      })
      .then((dr) => !!dr?.isStreak)
  }

  findByWhere(where: WhereDailyRequestType): Promise<DailyRequestType[]> {
    const prismaWhere: any = {
      deletedAt: null
    }

    if (where.id) prismaWhere.id = where.id

    // no category-based filtering in current schema

    return this.prismaService.dailyRequest.findMany({
      where: prismaWhere,
      include: {
        reward: true
      }
    })
  }

  // category-based queries removed — schema uses isStreak and dailyRequestType fields

  /**
   * Find daily requests by their `dailyRequestType` field (e.g. 'LOGIN', 'EXERCISE')
   */
  findByType(type: string | string[]): Promise<DailyRequestType[]> {
    return this.prismaService.dailyRequest.findMany({
      where: {
        deletedAt: null,
        ...(Array.isArray(type)
          ? { dailyRequestType: { in: type as any } }
          : { dailyRequestType: type as any })
      },
      include: {
        reward: true
      }
    })
  }
}
