import { I18nService } from '@/i18n/i18n.service'
import { ShopItemMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { ShopItemNotFoundException } from './dto/shop-item.error'
import {
  CreateShopItemBodyType,
  UpdateShopItemBodyType
} from './entities/shop-item.entity'
import { ShopItemRepo } from './shop-item.repo'

@Injectable()
export class ShopItemService {
  constructor(
    private shopItemRepo: ShopItemRepo,
    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.shopItemRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(ShopItemMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const shopItem = await this.shopItemRepo.findById(id)
    if (!shopItem) {
      throw new ShopItemNotFoundException()
    }

    return {
      statusCode: 200,
      data: shopItem,
      message: this.i18nService.translate(ShopItemMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateShopItemBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.shopItemRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(ShopItemMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: UpdateShopItemBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const shopItem = await this.shopItemRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: shopItem,
        message: this.i18nService.translate(ShopItemMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopItemNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existShopItem = await this.shopItemRepo.findById(id)
      if (!existShopItem) {
        throw new ShopItemNotFoundException()
      }

      await this.shopItemRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(ShopItemMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopItemNotFoundException()
      }
      throw error
    }
  }
}
