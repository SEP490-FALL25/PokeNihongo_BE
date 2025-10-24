import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { WeekDayType } from '@/common/constants/attendence-config.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  ATTENDANCE_CONFIG_FIELDS,
  AttendanceConfigType,
  CreateAttendanceConfigBodyType,
  UpdateAttendanceConfigBodyType
} from './entities/attendence-config.entity'

@Injectable()
export class AttendenceConfigRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateAttendanceConfigBodyType
  }): Promise<AttendanceConfigType> {
    return this.prismaService.attendanceConfig.create({
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
    updatedById: number
    data: UpdateAttendanceConfigBodyType
  }): Promise<AttendanceConfigType> {
    return this.prismaService.attendanceConfig.update({
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
  ): Promise<AttendanceConfigType> {
    return isHard
      ? this.prismaService.attendanceConfig.delete({
          where: {
            id
          }
        })
      : this.prismaService.attendanceConfig.update({
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
    const { where, orderBy } = parseQs(pagination.qs, ATTENDANCE_CONFIG_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.attendanceConfig.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.attendanceConfig.findMany({
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

  findById(id: number): Promise<AttendanceConfigType | null> {
    return this.prismaService.attendanceConfig.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByDateOfWeek(dayOfWeek: WeekDayType): Promise<AttendanceConfigType | null> {
    return this.prismaService.attendanceConfig.findFirst({
      where: {
        dayOfWeek,
        deletedAt: null
      }
    })
  }
}
