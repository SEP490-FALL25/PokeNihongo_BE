import { NotificationMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class NotificationNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: NotificationMessage.NOT_FOUND,
      errorKey: NotificationMessage.NOT_FOUND
    })
  }
}

export class NotificationAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: NotificationMessage.ALREADY_EXISTS,
      errorKey: NotificationMessage.ALREADY_EXISTS
    })
  }
}
