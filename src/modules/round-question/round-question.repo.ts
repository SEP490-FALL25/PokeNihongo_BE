import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateRoundQuestionBodyType,
  RoundQuestionType,
  USER_SEASON_HISTORY_FIELDS,
  UpdateRoundQuestionBodyType
} from './entities/round-question.entity'

@Injectable()
export class RoundQuestionRepo {
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
      data: CreateRoundQuestionBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<RoundQuestionType> {
    const client = prismaTx || this.prismaService
    return client.roundQuestion.create({
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
      data: UpdateRoundQuestionBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<RoundQuestionType> {
    const client = prismaTx || this.prismaService
    return client.roundQuestion.update({
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
  ): Promise<RoundQuestionType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.roundQuestion.delete({
          where: { id }
        })
      : client.roundQuestion.update({
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
      this.prismaService.roundQuestion.count({
        where: filterWhere
      }),
      this.prismaService.roundQuestion.findMany({
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

  findById(id: number): Promise<RoundQuestionType | null> {
    return this.prismaService.roundQuestion.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }
}
