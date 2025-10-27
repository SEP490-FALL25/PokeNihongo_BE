import { GachaItemRateMessage } from '@/i18n/message-keys'
import { NotFoundException } from '@nestjs/common'

export class GachaItemRateNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: GachaItemRateMessage.NOT_FOUND,
      errorKey: GachaItemRateMessage.NOT_FOUND
    })
  }
}

export class GachaItemRateAlreadyExistsException extends NotFoundException {
  constructor() {
    super({
      message: GachaItemRateMessage.ALREADY_EXISTS,
      errorKey: GachaItemRateMessage.ALREADY_EXISTS
    })
  }
}
