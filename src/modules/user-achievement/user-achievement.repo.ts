import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateUserAchievementBodyType,
  USER_GACHA_PITY_FIELDS,
  UpdateUserAchievementBodyType,
  UserAchievementType
} from './entities/user-achievement.entity'

@Injectable()
export class UserAchievementRepo {
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
      data: CreateUserAchievementBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<UserAchievementType> {
    const client = prismaTx || this.prismaService
    return client.userAchievement.create({
      data: {
        ...data,
        userId: data.userId || createdById
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
      data: UpdateUserAchievementBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<UserAchievementType> {
    const client = prismaTx || this.prismaService
    return client.userAchievement.update({
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
  ): Promise<UserAchievementType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.userAchievement.delete({
          where: { id }
        })
      : client.userAchievement.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async list(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(pagination.qs, USER_GACHA_PITY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userAchievement.count({
        where: filterWhere
      }),
      this.prismaService.userAchievement.findMany({
        where: filterWhere,

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

  findById(id: number): Promise<UserAchievementType | null> {
    return this.prismaService.userAchievement.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }
}
