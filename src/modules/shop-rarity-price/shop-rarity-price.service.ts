import { RarityPokemonType } from '@/common/constants/pokemon.constant'
import { I18nService } from '@/i18n/i18n.service'
import { ShopRarityPriceMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import {
  ShopRarityPriceAlreadyExistsException,
  ShopRarityPriceNotFoundException
} from './dto/shop-rarity-price.error'
import {
  CreateShopRarityPriceBodyType,
  UpdateShopRarityPriceBodyType
} from './entities/shop-rarity-price.entity'
import { ShopRarityPriceRepo } from './shop-rarity-price.repo'

@Injectable()
export class ShopRarityPriceService {
  constructor(
    private shopRarityPriceRepo: ShopRarityPriceRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.shopRarityPriceRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(ShopRarityPriceMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const shopRarityPrice = await this.shopRarityPriceRepo.findById(id)
    if (!shopRarityPrice) {
      throw new ShopRarityPriceNotFoundException()
    }

    return {
      statusCode: 200,
      data: shopRarityPrice,
      message: this.i18nService.translate(ShopRarityPriceMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateShopRarityPriceBodyType },
    lang: string = 'vi'
  ) {
    try {
      //check exist gacha item rate by star type
      const existShopRarityPrice = await this.shopRarityPriceRepo.getByType(data.rarity)
      if (existShopRarityPrice) {
        throw new ShopRarityPriceAlreadyExistsException()
      }

      const result = await this.shopRarityPriceRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(ShopRarityPriceMessage.CREATE_SUCCESS, lang)
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
      data: UpdateShopRarityPriceBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      if (data.rarity) {
        //check exist gacha item rate by star type
        const existShopRarityPrice = await this.shopRarityPriceRepo.getByType(data.rarity)
        if (existShopRarityPrice && existShopRarityPrice.id !== id) {
          throw new ShopRarityPriceAlreadyExistsException()
        }
      }

      const shopRarityPrice = await this.shopRarityPriceRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: shopRarityPrice,
        message: this.i18nService.translate(ShopRarityPriceMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopRarityPriceNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existShopRarityPrice = await this.shopRarityPriceRepo.findById(id)
      if (!existShopRarityPrice) {
        throw new ShopRarityPriceNotFoundException()
      }

      await this.shopRarityPriceRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(ShopRarityPriceMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new ShopRarityPriceNotFoundException()
      }
      throw error
    }
  }

  async getByType(rarity: RarityPokemonType) {
    return await this.shopRarityPriceRepo.getByType(rarity)
  }
}
