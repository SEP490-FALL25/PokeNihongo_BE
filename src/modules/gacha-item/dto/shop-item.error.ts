import { GachaItemMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class GachaItemNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: GachaItemMessage.NOT_FOUND,
      errorKey: GachaItemMessage.NOT_FOUND
    })
  }
}

export class InvalidShopBannerTimeException extends BadRequestException {
  constructor() {
    super({
      message: GachaItemMessage.GACHA_BANNER_INVALID,
      errorKey: GachaItemMessage.GACHA_BANNER_INVALID
    })
  }
}

export class ShopBannerInactiveException extends BadRequestException {
  constructor() {
    super({
      message: GachaItemMessage.GACHA_BANNER_INACTIVE,
      errorKey: GachaItemMessage.GACHA_BANNER_INACTIVE
    })
  }
}

export class ShopBannerActiveException extends BadRequestException {
  constructor() {
    super({
      message: GachaItemMessage.GACHA_BANNER_ACTIVE,
      errorKey: GachaItemMessage.GACHA_BANNER_ACTIVE
    })
  }
}

export class ShopBannerExpiredException extends BadRequestException {
  constructor() {
    super({
      message: GachaItemMessage.GACHA_BANNER_EXPIRED,
      errorKey: GachaItemMessage.GACHA_BANNER_EXPIRED
    })
  }
}

export class PokemonDuplicateException extends BadRequestException {
  constructor() {
    super({
      message: GachaItemMessage.POKEMON_DUPLICATE,
      errorKey: GachaItemMessage.POKEMON_DUPLICATE
    })
  }
}

export class MaxItemsExceededException extends BadRequestException {
  constructor() {
    super({
      message: GachaItemMessage.MAX_ITEMS_EXCEEDED,
      errorKey: GachaItemMessage.MAX_ITEMS_EXCEEDED
    })
  }
}
