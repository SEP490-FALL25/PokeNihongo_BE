import { MatchQueueMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class MatchQueueAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: MatchQueueMessage.ALREADY_EXISTS,
      errorKey: MatchQueueMessage.ALREADY_EXISTS
    })
  }
}

export class UserNotEnoughConditionException extends ConflictException {
  constructor() {
    super({
      message: MatchQueueMessage.USER_NOT_ENOUGH_CONDITION,
      errorKey: MatchQueueMessage.USER_NOT_ENOUGH_CONDITION
    })
  }
}
