import { MatchRoundParticipantMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class MatchRoundParticipantNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: MatchRoundParticipantMessage.NOT_FOUND,
      errorKey: MatchRoundParticipantMessage.NOT_FOUND
    })
  }
}

export class MatchRoundParticipantAlreadyExistsException extends BadRequestException {
  constructor() {
    super({
      message: MatchRoundParticipantMessage.ALREADY_EXISTS,
      errorKey: MatchRoundParticipantMessage.ALREADY_EXISTS
    })
  }
}
