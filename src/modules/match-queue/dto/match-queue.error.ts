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
  constructor(data?: string) {
    super({
      message: MatchQueueMessage.USER_NOT_ENOUGH_CONDITION,
      errorKey: MatchQueueMessage.USER_NOT_ENOUGH_CONDITION,
      data: data || null
    })
  }
}

export class YouHasMatchException extends ConflictException {
  constructor() {
    super({
      message: MatchQueueMessage.YOU_HAS_MATCH,
      errorKey: MatchQueueMessage.YOU_HAS_MATCH
    })
  }
}
