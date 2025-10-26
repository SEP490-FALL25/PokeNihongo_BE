import { ShopItemMessage } from '@/i18n/message-keys'
import { NotFoundException } from '@nestjs/common'

export class ShopItemNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: ShopItemMessage.NOT_FOUND,
      errorKey: ShopItemMessage.NOT_FOUND
    })
  }
}
