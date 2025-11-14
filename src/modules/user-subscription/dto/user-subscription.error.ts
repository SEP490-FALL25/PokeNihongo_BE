import { UserSubscriptionMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class UserSubscriptionNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: UserSubscriptionMessage.NOT_FOUND,
      errorKey: UserSubscriptionMessage.NOT_FOUND
    })
  }
}

export class UserSubscriptionAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: UserSubscriptionMessage.ALREADY_EXISTS,
      errorKey: UserSubscriptionMessage.ALREADY_EXISTS
    })
  }
}
