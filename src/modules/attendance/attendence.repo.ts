import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  ATTENDANCE_FIELDS,
  AttendanceType,
  CreateAttendanceBodyType,
  UpdateAttendanceBodyType
} from './entities/attendance.entity'

@Injectable()
export class AttendanceRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateAttendanceBodyType
  }): Promise<AttendanceType> {
    return this.prismaService.attendance.create({
      data: {
        ...data,
        createdById,
        deletedAt: null
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
    data: UpdateAttendanceBodyType
  }): Promise<AttendanceType> {
    return this.prismaService.attendance.update({
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
  ): Promise<AttendanceType> {
    return isHard
      ? this.prismaService.attendance.delete({
          where: {
            id
          }
        })
      : this.prismaService.attendance.update({
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
    const { where, orderBy } = parseQs(pagination.qs, ATTENDANCE_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.attendance.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.attendance.findMany({
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

  findById(id: number): Promise<AttendanceType | null> {
    return this.prismaService.attendance.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findStreakWithStartEndDay(
    userId: number,
    startOfWeek: Date,
    endOfWeek: Date
  ): Promise<AttendanceType[]> {
    return this.prismaService.attendance.findMany({
      where: {
        userId,
        date: {
          gte: startOfWeek,
          lte: endOfWeek
        },
        deletedAt: null
      },
      orderBy: { date: 'desc' }
    })
  }

  findByUserIdAndDate(userId: number, date: Date): Promise<AttendanceType | null> {
    return this.prismaService.attendance.findFirst({
      where: {
        userId,
        date
      }
    })
  }

  findByUserId(userId: number): Promise<AttendanceType[]> {
    return this.prismaService.attendance.findMany({
      where: {
        userId,
        deletedAt: null
      },
      orderBy: { date: 'desc' }
    })
  }
}
