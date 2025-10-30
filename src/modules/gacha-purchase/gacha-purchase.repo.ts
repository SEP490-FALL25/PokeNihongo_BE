import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateGachaPurchaseBodyType,
  GachaPurchaseType,
  SHOP_PURCHASE_FIELDS,
  UpdateGachaPurchaseBodyType
} from './entities/gacha-purchase.entity'

@Injectable()
export class GachaPurchaseRepo {
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
      data: CreateGachaPurchaseBodyType & {
        totalPrice: number
        userId: number
        walletTransId: number | null
      }
    },
    prismaTx?: PrismaClient
  ): Promise<GachaPurchaseType> {
    const client = prismaTx || this.prismaService
    return client.gachaPurchase.create({
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
      data: UpdateGachaPurchaseBodyType & { walletTransId?: number | null }
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<GachaPurchaseType> {
    const client = prismaTx || this.prismaService
    return client.gachaPurchase.update({
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
  ): Promise<GachaPurchaseType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.gachaPurchase.delete({
          where: { id }
        })
      : client.gachaPurchase.update({
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
    const { where, orderBy } = parseQs(pagination.qs, SHOP_PURCHASE_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.gachaPurchase.count({
        where: filterWhere
      }),
      this.prismaService.gachaPurchase.findMany({
        where: filterWhere,
        include: {
          shopItem: true,
          walletTrans: true,
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

  findById(id: number): Promise<GachaPurchaseType | null> {
    return this.prismaService.gachaPurchase.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        shopItem: true,
        walletTrans: true
      }
    })
  }

  findByUserId(userId: number): Promise<GachaPurchaseType[]> {
    return this.prismaService.gachaPurchase.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        shopItem: true,
        walletTrans: true
      }
    })
  }

  // Tính tổng số lượng user đã mua cho 1 shop item cụ thể
  async getTotalPurchasedQuantityByUserAndItem(
    userId: number,
    shopItemId: number
  ): Promise<number> {
    const purchases = await this.prismaService.gachaPurchase.findMany({
      where: {
        userId,
        shopItemId,
        deletedAt: null
      },
      select: {
        quantity: true
      }
    })

    return purchases.reduce((total, purchase) => total + purchase.quantity, 0)
  }
}
