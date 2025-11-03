import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { RoundStatus } from '@/common/constants/match.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateMatchRoundBodyType,
  MATCH_FIELDS,
  MatchRoundType,
  UpdateMatchRoundBodyType
} from './entities/match-round.entity'

@Injectable()
export class MatchRoundRepo {
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
      data: CreateMatchRoundBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<MatchRoundType> {
    const client = prismaTx || this.prismaService
    return client.matchRound.create({
      data: {
        ...data
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
      data: UpdateMatchRoundBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<MatchRoundType> {
    const client = prismaTx || this.prismaService

    const updatedMatchRound = await client.matchRound.update({
      where: { id, deletedAt: null },
      data: {
        ...data
      }
    })

    return updatedMatchRound
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
  ): Promise<MatchRoundType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.matchRound.delete({
          where: {
            id
          }
        })
      : await client.matchRound.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
    return result
  }

  async list(pagination: PaginationQueryType, langId?: number) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, MATCH_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Build base where
    const where: any = { deletedAt: null, ...rawWhere }

    // Support filtering by nameTranslation/nameTranslations via relational filter

    const [totalItems, data] = await Promise.all([
      this.prismaService.matchRound.count({ where }),
      this.prismaService.matchRound.findMany({
        where,

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

  findById(id: number): Promise<MatchRoundType | null> {
    return this.prismaService.matchRound.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  updateWinnerRoundWithUserIdById({
    id,
    roundWinnerId
  }: {
    id: number
    roundWinnerId: number
  }) {
    return this.prismaService.matchRound.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        roundWinnerId,
        status: RoundStatus.COMPLETED,
        updatedAt: new Date()
      }
    })
  }
}
