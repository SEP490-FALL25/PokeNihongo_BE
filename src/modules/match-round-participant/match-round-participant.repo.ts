import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateMatchRoundParticipantBodyType,
  MATCH_PARTICIPANT_FIELDS,
  MatchRoundParticipantType,
  UpdateMatchRoundParticipantBodyType
} from './entities/match-round-participant.entity'

@Injectable()
export class MatchRoundParticipantRepo {
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
      data: CreateMatchRoundParticipantBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<MatchRoundParticipantType> {
    const client = prismaTx || this.prismaService
    return client.matchRoundParticipant.create({
      data: {
        ...data
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
      data: UpdateMatchRoundParticipantBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<MatchRoundParticipantType> {
    const client = prismaTx || this.prismaService
    return client.matchRoundParticipant.update({
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
  ): Promise<MatchRoundParticipantType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.matchRoundParticipant.delete({
          where: { id }
        })
      : client.matchRoundParticipant.update({
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
    const { where, orderBy } = parseQs(pagination.qs, MATCH_PARTICIPANT_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.matchRoundParticipant.count({
        where: filterWhere
      }),
      this.prismaService.matchRoundParticipant.findMany({
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

  findById(id: number): Promise<MatchRoundParticipantType | null> {
    return this.prismaService.matchRoundParticipant.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }
}
