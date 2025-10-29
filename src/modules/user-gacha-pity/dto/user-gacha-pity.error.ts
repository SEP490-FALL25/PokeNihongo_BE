import { UserGachaPityMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class UserGachaPityNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: UserGachaPityMessage.NOT_FOUND,
      errorKey: UserGachaPityMessage.NOT_FOUND
    })
  }
}

export class UserGachaPityAlreadyExistsException extends BadRequestException {
  constructor() {
    super({
      message: UserGachaPityMessage.ALREADY_EXISTS,
      errorKey: UserGachaPityMessage.ALREADY_EXISTS
    })
  }
}

export class UserGachaPityHasPendingException extends BadRequestException {
  constructor() {
    super({
      message: UserGachaPityMessage.HAS_PENDING,
      errorKey: UserGachaPityMessage.HAS_PENDING
    })
  }
}
