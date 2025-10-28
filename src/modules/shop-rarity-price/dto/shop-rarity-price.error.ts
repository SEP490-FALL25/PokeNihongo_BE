import { ShopRarityPriceMessage } from '@/i18n/message-keys'
import { NotFoundException } from '@nestjs/common'

export class ShopRarityPriceNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: ShopRarityPriceMessage.NOT_FOUND,
      errorKey: ShopRarityPriceMessage.NOT_FOUND
    })
  }
}

export class ShopRarityPriceAlreadyExistsException extends NotFoundException {
  constructor() {
    super({
      message: ShopRarityPriceMessage.ALREADY_EXISTS,
      errorKey: ShopRarityPriceMessage.ALREADY_EXISTS
    })
  }
}
