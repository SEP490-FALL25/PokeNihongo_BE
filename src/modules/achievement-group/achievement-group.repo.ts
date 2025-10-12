import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
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

  async list(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(pagination.qs, ACHIEVEMENT_GROUP_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.achievementGroup.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.achievementGroup.findMany({
        where: { deletedAt: null, ...where },
        orderBy,
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
