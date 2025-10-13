import { UserDailyRequestMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class UserDailyRequestAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: UserDailyRequestMessage.ALREADY_EXISTS,
      errorKey: UserDailyRequestMessage.ALREADY_EXISTS
    })
  }
}

export class UserAlreadyAttendedTodayException extends ConflictException {
  constructor() {
    super({
      message: UserDailyRequestMessage.USER_ALREADY_ATTENDED_TODAY,
      errorKey: UserDailyRequestMessage.USER_ALREADY_ATTENDED_TODAY
    })
  }
}
