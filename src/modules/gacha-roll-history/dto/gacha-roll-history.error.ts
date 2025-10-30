import { GachaRollHistoryMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class GachaRollHistoryNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: GachaRollHistoryMessage.NOT_FOUND,
      errorKey: GachaRollHistoryMessage.NOT_FOUND
    })
  }
}

export class GachaRollHistoryAlreadyExistsException extends BadRequestException {
  constructor() {
    super({
      message: GachaRollHistoryMessage.ALREADY_EXISTS,
      errorKey: GachaRollHistoryMessage.ALREADY_EXISTS
    })
  }
}
