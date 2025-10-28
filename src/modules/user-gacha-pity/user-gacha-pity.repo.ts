import { GachaStarTypeType } from '@/common/constants/gacha.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateGachaItemRateBodyType,
  GACHA_ITEM_RATE_FIELDS,
  GachaItemRateType,
  UpdateGachaItemRateBodyType
} from './entities/user-gacha-pityentity'

@Injectable()
export class GachaItemRateRepo {
  constructor(private prismaService: PrismaService) {}
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }
  create(
    {
      createdById,
      data
    }: {
      createdById?: number
      data: CreateGachaItemRateBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<GachaItemRateType> {
    const client = prismaTx || this.prismaService
    return client.gachaItemRate.create({
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
      data: UpdateGachaItemRateBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<GachaItemRateType> {
    const client = prismaTx || this.prismaService
    return client.gachaItemRate.update({
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
  ): Promise<GachaItemRateType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.gachaItemRate.delete({
          where: { id }
        })
      : client.gachaItemRate.update({
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
    const { where, orderBy } = parseQs(pagination.qs, GACHA_ITEM_RATE_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.gachaItemRate.count({
        where: filterWhere
      }),
      this.prismaService.gachaItemRate.findMany({
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

  findById(id: number): Promise<GachaItemRateType | null> {
    return this.prismaService.gachaItemRate.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  getByType(starType: GachaStarTypeType): Promise<GachaItemRateType | null> {
    return this.prismaService.gachaItemRate.findFirst({
      where: {
        starType,
        deletedAt: null
      }
    })
  }
}
