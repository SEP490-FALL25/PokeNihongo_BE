import { ShopItemMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class ShopItemNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: ShopItemMessage.NOT_FOUND,
      errorKey: ShopItemMessage.NOT_FOUND
    })
  }
}

export class InvalidShopBannerTimeException extends BadRequestException {
  constructor() {
    super({
      message: ShopItemMessage.SHOP_BANNER_INVALID,
      errorKey: ShopItemMessage.SHOP_BANNER_INVALID
    })
  }
}

export class PokemonDuplicateException extends BadRequestException {
  constructor() {
    super({
      message: ShopItemMessage.POKEMON_DUPLICATE,
      errorKey: ShopItemMessage.POKEMON_DUPLICATE
    })
  }
}

export class MaxItemsExceededException extends BadRequestException {
  constructor() {
    super({
      message: ShopItemMessage.MAX_ITEMS_EXCEEDED,
      errorKey: ShopItemMessage.MAX_ITEMS_EXCEEDED
    })
  }
}
