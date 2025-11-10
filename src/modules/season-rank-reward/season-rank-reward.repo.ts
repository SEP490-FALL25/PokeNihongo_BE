import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateSeasonRankRewardBodyType,
  SeasonRankRewardType,
  USER_SEASON_HISTORY_FIELDS,
  UpdateSeasonRankRewardBodyType
} from './entities/season-rank-reward.entity'

@Injectable()
export class SeasonRankRewardRepo {
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
      data: CreateSeasonRankRewardBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<SeasonRankRewardType> {
    const client = prismaTx || this.prismaService
    return client.seasonRankReward.create({
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
      data: UpdateSeasonRankRewardBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<SeasonRankRewardType> {
    const client = prismaTx || this.prismaService
    return client.seasonRankReward.update({
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
    id: number,
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<SeasonRankRewardType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.seasonRankReward.delete({
          where: { id }
        })
      : client.seasonRankReward.update({
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
      this.prismaService.seasonRankReward.count({
        where: filterWhere
      }),
      this.prismaService.seasonRankReward.findMany({
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

  findById(id: number): Promise<SeasonRankRewardType | null> {
    return this.prismaService.seasonRankReward.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }
}
