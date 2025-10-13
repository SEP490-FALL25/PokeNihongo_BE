import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateDailyRequestBodyType,
  DailyRequestType,
  REWARD_FIELDS,
  UpdateDailyRequestBodyType
} from './entities/daily-request.entity'

@Injectable()
export class DailyRequestRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateDailyRequestBodyType
  }): Promise<DailyRequestType> {
    return this.prismaService.dailyRequest.create({
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
    data: UpdateDailyRequestBodyType
  }): Promise<DailyRequestType> {
    return this.prismaService.dailyRequest.update({
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
  ): Promise<DailyRequestType> {
    return isHard
      ? this.prismaService.dailyRequest.delete({
          where: {
            id
          }
        })
      : this.prismaService.dailyRequest.update({
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
    const { where, orderBy } = parseQs(pagination.qs, REWARD_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.dailyRequest.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.dailyRequest.findMany({
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

  findById(id: number): Promise<DailyRequestType | null> {
    return this.prismaService.dailyRequest.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }
}
