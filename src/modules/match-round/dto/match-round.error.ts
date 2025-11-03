import { MatchRoundMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class MatchRoundAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: MatchRoundMessage.ALREADY_EXISTS,
      errorKey: MatchRoundMessage.ALREADY_EXISTS
    })
  }
}
