import { RoundQuestionsAnswerLogMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class RoundQuestionsAnswerLogNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: RoundQuestionsAnswerLogMessage.NOT_FOUND,
      errorKey: RoundQuestionsAnswerLogMessage.NOT_FOUND
    })
  }
}

export class RoundQuestionsAnswerLogAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: RoundQuestionsAnswerLogMessage.ALREADY_EXISTS,
      errorKey: RoundQuestionsAnswerLogMessage.ALREADY_EXISTS
    })
  }
}
