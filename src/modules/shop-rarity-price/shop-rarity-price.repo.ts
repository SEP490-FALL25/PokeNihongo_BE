import { RarityPokemonType } from '@/common/constants/pokemon.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateShopRarityPriceBodyType,
  SHOP_RARITY_PRICE_FIELDS,
  ShopRarityPriceType,
  UpdateShopRarityPriceBodyType
} from './entities/shop-rarity-price.entity'

@Injectable()
export class ShopRarityPriceRepo {
  constructor(private prismaService: PrismaService) { }
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }
  create(
    {
      createdById,
      data
    }: {
      createdById?: number
      data: CreateShopRarityPriceBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<ShopRarityPriceType> {
    const client = prismaTx || this.prismaService
    return client.shopRarityPrice.create({
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
      data: UpdateShopRarityPriceBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<ShopRarityPriceType> {
    const client = prismaTx || this.prismaService
    return client.shopRarityPrice.update({
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

  /**
 * Update nhiều shop rarity prices cùng lúc
 */
  async updateMany(
    {
      updatedById,
      items
    }: {
      updatedById?: number
      items: Array<{ id: number } & UpdateShopRarityPriceBodyType>
    },
    prismaTx?: PrismaClient
  ): Promise<ShopRarityPriceType[]> {
    const client = prismaTx || this.prismaService
    const updatedItems: ShopRarityPriceType[] = []

    for (const item of items) {
      const { id, ...data } = item
      const updated = await client.shopRarityPrice.update({
        where: {
          id,
          deletedAt: null
        },
        data: {
          ...data,
          updatedById
        }
      })
      updatedItems.push(updated)
    }

    return updatedItems
  }
  delete(
    id: number,
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<ShopRarityPriceType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.shopRarityPrice.delete({
        where: { id }
      })
      : client.shopRarityPrice.update({
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
    const { where, orderBy } = parseQs(pagination.qs, SHOP_RARITY_PRICE_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.shopRarityPrice.count({
        where: filterWhere
      }),
      this.prismaService.shopRarityPrice.findMany({
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

  findById(id: number): Promise<ShopRarityPriceType | null> {
    return this.prismaService.shopRarityPrice.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  getByType(rarity: RarityPokemonType): Promise<ShopRarityPriceType | null> {
    return this.prismaService.shopRarityPrice.findFirst({
      where: {
        rarity,
        deletedAt: null
      }
    })
  }
}
