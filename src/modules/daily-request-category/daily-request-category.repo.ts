import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

// Category is stored in DB as DailyRequestCategory model
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateDailyRequestCategoryBodyType,
  DAILY_REQUEST_CATEGORY_FIELDS,
  DailyRequestCategoryType,
  UpdateDailyRequestCategoryBodyType
} from './entities/daily-request-category.entity'

export type WhereDailyRequestCategoryType = {
  id?: number
  ids?: number | number[] | { in: number[] }
}

@Injectable()
export class DailyRequestCategoryRepo {
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
      data: CreateDailyRequestCategoryBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<DailyRequestCategoryType> {
    const client = prismaTx || this.prismaService
    return client.dailyRequestCategory.create({
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
      data: UpdateDailyRequestCategoryBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<DailyRequestCategoryType> {
    const client = prismaTx || this.prismaService
    return client.dailyRequestCategory.update({
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
  ): Promise<DailyRequestCategoryType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? this.prismaService.dailyRequestCategory.delete({
          where: {
            id
          }
        })
      : this.prismaService.dailyRequestCategory.update({
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
    const { where: rawWhere = {}, orderBy } = parseQs(
      pagination.qs,
      DAILY_REQUEST_CATEGORY_FIELDS
    )

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // --- 2. Xử lý filter nameTranslation và descriptionTranslation ---
    let nameKeys: string[] | undefined

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

    // --- 3. Build final where ---
    const where: any = {
      deletedAt: null,
      ...rawWhere,
      ...(nameKeys ? { nameKey: { in: nameKeys } } : {})
    }

    // --- 4. Query tổng số + data ---
    const [totalItems, data] = await Promise.all([
      this.prismaService.dailyRequestCategory.count({ where }),
      this.prismaService.dailyRequestCategory.findMany({
        where,
        orderBy,
        skip,
        take
      })
    ])

    // --- 5. Include nameTranslation và descriptionTranslation ---
    const allKeys = Array.from(new Set(data.flatMap((d) => [d.nameKey])))

    const translations = await this.prismaService.translation.findMany({
      where: {
        key: { in: allKeys },
        languageId: langId // dùng langId từ param
      },
      select: { key: true, value: true }
    })

    const results = data.map((d) => ({
      ...d,
      nameTranslation: translations.find((t) => t.key === d.nameKey)?.value || d.nameKey
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

  findById(id: number): Promise<DailyRequestCategoryType | null> {
    return this.prismaService.dailyRequestCategory.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }
}
