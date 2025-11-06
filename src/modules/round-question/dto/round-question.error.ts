import { RoundQuestionMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class RoundQuestionNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: RoundQuestionMessage.NOT_FOUND,
      errorKey: RoundQuestionMessage.NOT_FOUND
    })
  }
}

export class RoundQuestionAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: RoundQuestionMessage.ALREADY_EXISTS,
      errorKey: RoundQuestionMessage.ALREADY_EXISTS
    })
  }
}
