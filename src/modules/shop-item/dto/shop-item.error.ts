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

export class ShopBannerInactiveException extends BadRequestException {
  constructor() {
    super({
      message: ShopItemMessage.SHOP_BANNER_INACTIVE,
      errorKey: ShopItemMessage.SHOP_BANNER_INACTIVE
    })
  }
}

export class ShopBannerActiveException extends BadRequestException {
  constructor() {
    super({
      message: ShopItemMessage.SHOP_BANNER_ACTIVE,
      errorKey: ShopItemMessage.SHOP_BANNER_ACTIVE
    })
  }
}

export class ShopBannerExpiredException extends BadRequestException {
  constructor() {
    super({
      message: ShopItemMessage.SHOP_BANNER_EXPIRED,
      errorKey: ShopItemMessage.SHOP_BANNER_EXPIRED
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
