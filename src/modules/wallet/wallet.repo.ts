import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { parseQs } from '@/common/utils/qs-parser'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateWalletBodyType,
  UpdateWalletBodyType,
  WALLET_FIELDS,
  WalletType
} from './entities/wallet.entity'

@Injectable()
export class WalletRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateWalletBodyType
  }): Promise<WalletType> {
    return this.prismaService.wallet.create({
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
    data: UpdateWalletBodyType
  }): Promise<WalletType> {
    return this.prismaService.wallet.update({
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
  ): Promise<WalletType> {
    return isHard
      ? this.prismaService.wallet.delete({
          where: {
            id
          }
        })
      : this.prismaService.wallet.update({
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
    const { where, orderBy } = parseQs(pagination.qs, WALLET_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.wallet.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.wallet.findMany({
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

  findById(id: number): Promise<WalletType | null> {
    return this.prismaService.wallet.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }
}
