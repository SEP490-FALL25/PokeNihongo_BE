import { ShopBannerMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException } from '@nestjs/common'

export class ShopBannerAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: ShopBannerMessage.ALREADY_EXISTS,
      errorKey: ShopBannerMessage.ALREADY_EXISTS
    })
  }
}

export class ShopBannerInvalidDateRangeException extends BadRequestException {
  constructor() {
    super({
      message: ShopBannerMessage.INVALID_DATA,
      errorKey: ShopBannerMessage.INVALID_DATA
    })
  }
}
