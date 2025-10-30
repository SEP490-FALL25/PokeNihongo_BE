import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateGachaRollHistoryBodyType,
  GACHA_ROLL_HISTORY_FIELDS,
  GachaRollHistoryType,
  UpdateGachaRollHistoryBodyType
} from './entities/gacha-roll-history.entity'

@Injectable()
export class GachaRollHistoryRepo {
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
      data: CreateGachaRollHistoryBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<GachaRollHistoryType> {
    const client = prismaTx || this.prismaService
    return client.gachaRollHistory.create({
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
      data: UpdateGachaRollHistoryBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<GachaRollHistoryType> {
    const client = prismaTx || this.prismaService
    return client.gachaRollHistory.update({
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
  ): Promise<GachaRollHistoryType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.gachaRollHistory.delete({
          where: { id }
        })
      : client.gachaRollHistory.update({
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
    const { where, orderBy } = parseQs(pagination.qs, GACHA_ROLL_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.gachaRollHistory.count({
        where: filterWhere
      }),
      this.prismaService.gachaRollHistory.findMany({
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

  findById(id: number): Promise<GachaRollHistoryType | null> {
    return this.prismaService.gachaRollHistory.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  async findListGachaHisByUserId(userId: number, pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(pagination.qs, GACHA_ROLL_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.gachaRollHistory.count({
        where: {
          ...filterWhere,
          userId
        }
      }),
      this.prismaService.gachaRollHistory.findMany({
        where: {
          ...filterWhere,
          userId
        },

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
}
