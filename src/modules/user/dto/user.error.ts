import { USER_MESSAGE } from '@/common/constants/message'
import { UserMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class UserNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: USER_MESSAGE.NOT_FOUND,
      errorKey: UserMessage.NOT_FOUND
    })
  }
}

export class EmailAlreadyExistsException extends BadRequestException {
  constructor() {
    super({
      message: USER_MESSAGE.EMAIL_ALREADY_EXISTS,
      errorKey: UserMessage.EMAIL_ALREADY_EXISTS
    })
  }
}
