import { GachaBannerMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException } from '@nestjs/common'

export class GachaBannerAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: GachaBannerMessage.ALREADY_EXISTS,
      errorKey: GachaBannerMessage.ALREADY_EXISTS
    })
  }
}

export class GachaBannerInvalidDateRangeException extends BadRequestException {
  constructor() {
    super({
      message: GachaBannerMessage.INVALID_DATA,
      errorKey: GachaBannerMessage.INVALID_DATA
    })
  }
}

export class GachaBannerActiveLimitExceededException extends BadRequestException {
  constructor() {
    super({
      message: GachaBannerMessage.ACTIVE_LIMIT_EXCEEDED,
      errorKey: GachaBannerMessage.ACTIVE_LIMIT_EXCEEDED
    })
  }
}

export class InvalidGachaBannerAmountItemsException extends BadRequestException {
  constructor(data?: string) {
    super({
      message: GachaBannerMessage.INVALID_AMOUNT_ITEMS,
      errorKey: GachaBannerMessage.INVALID_AMOUNT_ITEMS,
      data: data || null
    })
  }
}
