import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateRewardBodyType,
  REWARD_FIELDS,
  RewardType,
  UpdateRewardBodyType
} from './entities/reward.entity'

type RewardPrismaType = Omit<RewardType, 'nameKey'> & { name: string }

@Injectable()
export class RewardRepo {
  constructor(private prismaService: PrismaService) { }

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
      data: CreateRewardBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<RewardType> {
    const client = prismaTx || this.prismaService
    const { nameKey, ...restData } = data
    return client.reward.create({
      data: {
        ...restData,
        name: nameKey as any, // Map nameKey to name for Prisma
        createdById
      } as any
    }).then((result: any) => {
      const { name, ...rest } = result
      return { ...rest, nameKey: name } as RewardType
    })
  }

  update(
    {
      id,
      updatedById,
      data
    }: {
      id: number
      updatedById?: number
      data: UpdateRewardBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<RewardType> {
    const client = prismaTx || this.prismaService
    const { nameKey, ...restData } = data
    const updateData: any = { ...restData, updatedById }
    if (nameKey !== undefined) {
      updateData.name = nameKey
    }
    return client.reward.update({
      where: {
        id,
        deletedAt: null
      },
      data: updateData
    } as any).then((result: any) => {
      const { name, ...rest } = result
      return { ...rest, nameKey: name } as RewardType
    })
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
  ): Promise<RewardType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.reward.delete({
        where: {
          id
        }
      })
      : await client.reward.update({
        where: {
          id,
          deletedAt: null
        },
        data: {
          deletedAt: new Date(),
          deletedById
        }
      } as any)
    const { name, ...rest } = result as any
    return { ...rest, nameKey: name } as RewardType
  }

  async list(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(pagination.qs, REWARD_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.reward.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.reward.findMany({
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

  findById(id: number): Promise<RewardType | null> {
    return this.prismaService.reward
      .findUnique({
        where: {
          id,
          deletedAt: null
        }
      })
      .then((result: any) => {
        if (!result) return null
        const { name, ...rest } = result
        return { ...rest, nameKey: name } as RewardType
      })
  }
}
