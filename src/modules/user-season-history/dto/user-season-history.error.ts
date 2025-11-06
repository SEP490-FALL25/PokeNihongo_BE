import { UserSeasonHistoryMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class UserSeasonHistoryNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: UserSeasonHistoryMessage.NOT_FOUND,
      errorKey: UserSeasonHistoryMessage.NOT_FOUND
    })
  }
}

export class UserSeasonHistoryAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: UserSeasonHistoryMessage.ALREADY_EXISTS,
      errorKey: UserSeasonHistoryMessage.ALREADY_EXISTS
    })
  }
}
