import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  ACHIEVEMENT_GROUP_FIELDS,
  AchievementGroupType,
  CreateAchievementGroupBodyType,
  UpdateAchievementGroupBodyType
} from './entities/achievement-group.entity'

@Injectable()
export class AchievementGroupRepo {
  constructor(private prismaService: PrismaService) {}

  // Wrapper cho transaction
  async withTransaction<T>(fn: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(fn)
  }

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateAchievementGroupBodyType
  }): Promise<AchievementGroupType> {
    return this.prismaService.achievementGroup.create({
      data: {
        ...data,
        createdById
      }
    })
  }

  update({
    id,
    updatedById,
    data
  }: {
    id: number
    updatedById?: number
    data: UpdateAchievementGroupBodyType
  }): Promise<AchievementGroupType> {
    return this.prismaService.achievementGroup.update({
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
    isHard?: boolean
  ): Promise<AchievementGroupType> {
    return isHard
      ? this.prismaService.achievementGroup.delete({
          where: {
            id
          }
        })
      : this.prismaService.achievementGroup.update({
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

  async list(pagination: PaginationQueryType, languageId?: number) {
    // --- 1. Parse QS bình thường ---
    const { where: rawWhere = {}, orderBy } = parseQs(
      pagination.qs,
      ACHIEVEMENT_GROUP_FIELDS
    )

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // --- 2. Xử lý filter nameTranslation ---
    let nameKeys: string[] | undefined
    if (rawWhere.nameTranslation && languageId) {
      // Nếu rawWhere.nameTranslation là object { contains, mode }
      const searchValue =
        typeof rawWhere.nameTranslation === 'object'
          ? rawWhere.nameTranslation.contains
          : rawWhere.nameTranslation

      const translations = await this.prismaService.translation.findMany({
        where: {
          languageId: languageId, // từ param
          value: {
            contains: searchValue,
            mode: 'insensitive'
          }
        },
        select: { key: true }
      })

      nameKeys = translations.map((t) => t.key)

      // Nếu không tìm thấy translation nào, trả về rỗng
      if (nameKeys.length === 0) {
        return {
          results: [],
          pagination: {
            current: pagination.currentPage,
            pageSize: pagination.pageSize,
            totalPage: 0,
            totalItem: 0
          }
        }
      }
    }

    // --- 3. Build where clause ---
    const where: any = {
      deletedAt: null,
      ...rawWhere,
      ...(nameKeys && { nameKey: { in: nameKeys } })
    }

    // Loại bỏ nameTranslation khỏi where vì nó không phải field thực
    delete where.nameTranslation

    const [totalItems, data] = await Promise.all([
      this.prismaService.achievementGroup.count({
        where
      }),
      this.prismaService.achievementGroup.findMany({
        where,
        orderBy: orderBy || { displayOrder: 'asc' },
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findById(id: number): Promise<AchievementGroupType | null> {
    return this.prismaService.achievementGroup.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }
}
