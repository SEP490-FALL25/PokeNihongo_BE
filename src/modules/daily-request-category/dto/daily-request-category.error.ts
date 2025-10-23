import { DailyRequestCategoryMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class DailyRequestCategoryAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: DailyRequestCategoryMessage.ALREADY_EXISTS,
      errorKey: DailyRequestCategoryMessage.ALREADY_EXISTS
    })
  }
}

export class InValidTranslationException extends ConflictException {
  constructor() {
    super({
      message: DailyRequestCategoryMessage.ALREADY_EXISTS,
      errorKey: DailyRequestCategoryMessage.ALREADY_EXISTS
    })
  }
}
