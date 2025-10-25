import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateTranslationBodyType } from '../translation/entities/translation.entities'
import {
  CreateRewardBodyType,
  REWARD_FIELDS,
  RewardType,
  UpdateRewardBodyType
} from './entities/reward.entity'

type RewardPrismaType = Omit<RewardType, 'nameKey'> & { name: string }

@Injectable()
export class RewardRepo {
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
      data: CreateRewardBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<RewardType> {
    const client = prismaTx || this.prismaService
    return client.reward.create({
      data: {
        ...data,
        createdById
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
      data: UpdateRewardBodyType & {
        nameTranslations: CreateTranslationBodyType[]
        rewardNameKey: string
      }
    },
    prismaTx?: PrismaClient
  ): Promise<RewardType> {
    const client = prismaTx || this.prismaService
    const { nameTranslations, rewardNameKey, ...rewardData } = data

    const updatedReward = await client.reward.update({
      where: { id, deletedAt: null },
      data: {
        ...rewardData,
        updatedById
      }
    })

    // Upsert translations riêng
    await Promise.all(
      nameTranslations.map((tr) =>
        client.translation.upsert({
          where: {
            languageId_key: {
              languageId: tr.languageId,
              key: rewardNameKey
            }
          },
          create: {
            languageId: tr.languageId,
            key: rewardNameKey,
            value: tr.value,
            rewardNameKey
          },
          update: {
            value: tr.value
          }
        })
      )
    )

    return updatedReward
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
        })
    return result
  }

  async list(pagination: PaginationQueryType, langId?: number) {
    const { where, orderBy } = parseQs(pagination.qs, REWARD_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.reward.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.reward.findMany({
        where: { deletedAt: null, ...where },
        include: {
          nameTranslations: {
            where: langId ? { languageId: langId } : {}
          }
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

  findById(id: number): Promise<RewardType | null> {
    return this.prismaService.reward.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByIdWithLangId(id: number, langId: number): Promise<RewardType | null> {
    return this.prismaService.reward.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        nameTranslations: {
          where: {
            languageId: langId
          }
        }
      }
    })
  }
}
