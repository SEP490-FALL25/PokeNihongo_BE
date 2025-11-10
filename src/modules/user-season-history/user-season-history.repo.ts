import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateUserSeasonHistoryBodyType,
  USER_SEASON_HISTORY_FIELDS,
  UpdateUserSeasonHistoryBodyType,
  UserSeasonHistoryType
} from './entities/user-season-history.entity'

@Injectable()
export class UserSeasonHistoryRepo {
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
      data: CreateUserSeasonHistoryBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<UserSeasonHistoryType> {
    const client = prismaTx || this.prismaService
    return client.userSeasonHistory.create({
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
      data: UpdateUserSeasonHistoryBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<UserSeasonHistoryType> {
    const client = prismaTx || this.prismaService
    return client.userSeasonHistory.update({
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
  ): Promise<UserSeasonHistoryType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.userSeasonHistory.delete({
          where: { id }
        })
      : client.userSeasonHistory.update({
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
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userSeasonHistory.count({
        where: filterWhere
      }),
      this.prismaService.userSeasonHistory.findMany({
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

  findById(id: number): Promise<UserSeasonHistoryType | null> {
    return this.prismaService.userSeasonHistory.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findSeasonNowByUserId(userId: number): Promise<UserSeasonHistoryType | null> {
    return this.prismaService.userSeasonHistory.findFirst({
      where: {
        userId,
        deletedAt: null
      }
    })
  }

  checkUserHasSeasonHistoryInSeason(
    userId: number,
    seasonId: number
  ): Promise<UserSeasonHistoryType | null> {
    return this.prismaService.userSeasonHistory.findFirst({
      where: {
        userId,
        seasonId,
        deletedAt: null
      }
    })
  }
}
