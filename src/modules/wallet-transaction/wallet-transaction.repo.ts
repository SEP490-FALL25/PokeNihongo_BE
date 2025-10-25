import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { WalletTransactionTypeType } from '@/common/constants/wallet-transaction.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateWalletTransactionBodyType,
  UpdateWalletTransactionBodyType,
  WALLET_TRANSACTION_FIELDS,
  WalletTransactionType
} from './entities/wallet-transaction.entity'

@Injectable()
export class WalletTransactionRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateWalletTransactionBodyType
  }): Promise<WalletTransactionType> {
    return this.prismaService.walletTransaction.create({
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
    data: UpdateWalletTransactionBodyType
  }): Promise<WalletTransactionType> {
    return this.prismaService.walletTransaction.update({
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
  ): Promise<WalletTransactionType> {
    return isHard
      ? this.prismaService.walletTransaction.delete({
          where: {
            id
          }
        })
      : this.prismaService.walletTransaction.update({
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
    const { where, orderBy } = parseQs(pagination.qs, WALLET_TRANSACTION_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.walletTransaction.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.walletTransaction.findMany({
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

  findById(id: number): Promise<WalletTransactionType | null> {
    return this.prismaService.walletTransaction.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findByUserIdAndType(
    userId: number,
    type: WalletTransactionTypeType
  ): Promise<WalletTransactionType | null> {
    return this.prismaService.walletTransaction.findFirst({
      where: {
        userId,
        type,
        deletedAt: null
      }
    })
  }

  findByUserId(userId: number): Promise<WalletTransactionType[] | null> {
    return this.prismaService.walletTransaction.findMany({
      where: {
        userId,
        deletedAt: null
      }
    })
  }
}
