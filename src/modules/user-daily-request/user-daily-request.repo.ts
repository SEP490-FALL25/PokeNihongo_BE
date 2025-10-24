import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateUserDailyRequestBodyType,
  USER_DAILY_REQUEST_FIELDS,
  UpdateUserDailyRequestBodyType,
  UserDailyRequestDetailType,
  UserDailyRequestType
} from './entities/user-daily-request.entity'

@Injectable()
export class UserDailyRequestRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateUserDailyRequestBodyType & {
      date: Date
      progress: number
      isCompleted?: boolean
      completedAt?: Date | null
    }
  }): Promise<UserDailyRequestType> {
    return this.prismaService.userDailyRequest.create({
      data: {
        ...data,
        createdById,
        isCompleted: data.isCompleted ?? false,
        completedAt: data.completedAt ?? null
      }
    })
  }

  update({
    id,
    updatedById,
    data
  }: {
    id: number
    updatedById: number
    data: UpdateUserDailyRequestBodyType
  }): Promise<UserDailyRequestType> {
    return this.prismaService.userDailyRequest.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data,
        updatedById,
        completedAt: data.isCompleted ? new Date() : null
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
  ): Promise<UserDailyRequestType> {
    return isHard
      ? this.prismaService.userDailyRequest.delete({
          where: {
            id
          }
        })
      : this.prismaService.userDailyRequest.update({
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
    const { where, orderBy } = parseQs(pagination.qs, USER_DAILY_REQUEST_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.userDailyRequest.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.userDailyRequest.findMany({
        where: { deletedAt: null, ...where },
        include: {
          dailyRequest: true,
          user: true
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

  findById(id: number): Promise<UserDailyRequestType | null> {
    return this.prismaService.userDailyRequest.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        dailyRequest: true,
        user: true
      }
    })
  }

  findByUserIdDateDailyId(
    userId: number,
    date: Date,
    dailyRequestId: number
  ): Promise<UserDailyRequestType | null> {
    return this.prismaService.userDailyRequest.findFirst({
      where: {
        userId,
        date,
        dailyRequestId,
        deletedAt: null
      }
    })
  }

  // Lấy user daily requests theo userId và date
  async findByUserAndDate(userId: number, date: Date): Promise<UserDailyRequestType[]> {
    return this.prismaService.userDailyRequest.findMany({
      where: {
        userId,
        date,
        deletedAt: null
      },
      orderBy: {
        id: 'asc'
      }
    })
  }

  // Lấy user daily requests với chi tiết daily request và user
  async findByUserAndDateWithDetails(
    userId: number,
    date: Date
  ): Promise<UserDailyRequestDetailType[]> {
    return this.prismaService.userDailyRequest.findMany({
      where: {
        userId,
        date,
        deletedAt: null
      },
      include: {
        dailyRequest: {
          include: {
            reward: {
              select: {
                id: true,
                name: true,
                rewardItem: true,
                rewardTarget: true,
                rewardType: true
              }
            }
          }
        },
        user: true
      },
      orderBy: {
        isCompleted: 'asc'
      }
    })
  }
}
