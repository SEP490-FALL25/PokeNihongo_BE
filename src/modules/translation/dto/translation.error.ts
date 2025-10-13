import { TranslationMessage } from '@/i18n/message-keys'
import { ConflictException, HttpException, HttpStatus } from '@nestjs/common'

export const TranslationNotFoundException = new HttpException(
  {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Bản dịch không tồn tại',
    error: 'TRANSLATION_NOT_FOUND'
  },
  HttpStatus.NOT_FOUND
)

export const TranslationAlreadyExistsException = new HttpException(
  {
    statusCode: HttpStatus.CONFLICT,
    message: 'Bản dịch đã tồn tại',
    error: 'TRANSLATION_ALREADY_EXISTS'
  },
  HttpStatus.CONFLICT
)

export const InvalidTranslationDataException = new HttpException(
  {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Dữ liệu bản dịch không hợp lệ',
    error: 'INVALID_TRANSLATION_DATA'
  },
  HttpStatus.BAD_REQUEST
)

export class DuplicateLanguageException extends ConflictException {
  constructor() {
    super({
      message: TranslationMessage.DUPLICATE_LANGUAGE,
      errorKey: TranslationMessage.DUPLICATE_LANGUAGE
    })
  }
}

export class DuplicateRecordException extends ConflictException {
  constructor() {
    super({
      message: TranslationMessage.ALREADY_EXISTS,
      errorKey: TranslationMessage.ALREADY_EXISTS
    })
  }
}

export class DuplicateValueException extends ConflictException {
  constructor() {
    super({
      message: TranslationMessage.DUPLICATE_VALUE,
      errorKey: TranslationMessage.DUPLICATE_VALUE
    })
  }
}
