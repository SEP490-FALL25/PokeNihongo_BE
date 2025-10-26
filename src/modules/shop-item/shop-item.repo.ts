import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateShopItemBodyType,
  SHOP_ITEM_FIELDS,
  ShopItemType,
  UpdateShopItemBodyType
} from './entities/shop-item.entity'

@Injectable()
export class ShopItemRepo {
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
      data: CreateShopItemBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<ShopItemType> {
    const client = prismaTx || this.prismaService
    return client.shopItem.create({
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
      data: UpdateShopItemBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<ShopItemType> {
    const client = prismaTx || this.prismaService
    return client.shopItem.update({
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

  delete(id: number, isHard?: boolean, prismaTx?: PrismaClient): Promise<ShopItemType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.shopItem.delete({
          where: { id }
        })
      : client.shopItem.update({
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
    const { where, orderBy } = parseQs(pagination.qs, SHOP_ITEM_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.shopItem.count({
        where: filterWhere
      }),
      this.prismaService.shopItem.findMany({
        where: filterWhere,
        include: {
          pokemon: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              description: true,
              imageUrl: true,
              rarity: true,
              types: {
                select: {
                  id: true,
                  type_name: true,
                  display_name: true,
                  color_hex: true
                }
              }
            }
          },
          shopBanner: true
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

  findById(id: number): Promise<ShopItemType | null> {
    return this.prismaService.shopItem.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        pokemon: true,
        shopBanner: true
      }
    })
  }

  incrementPurchasedCount(
    id: number,
    quantity: number,
    prismaTx?: PrismaClient
  ): Promise<ShopItemType> {
    const client = prismaTx || this.prismaService
    return client.shopItem.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        purchasedCount: {
          increment: quantity
        }
      }
    })
  }
}
