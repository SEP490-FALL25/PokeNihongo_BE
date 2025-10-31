import { AuthMessage } from '@/i18n/message-keys'
import { UnauthorizedException } from '@nestjs/common'

export class MissingTokenException extends UnauthorizedException {
  constructor() {
    super({
      message: AuthMessage.MISSING_TOKEN,
      errorKey: AuthMessage.MISSING_TOKEN
    })
  }
}

export class InvalidTokenException extends UnauthorizedException {
  constructor() {
    super({
      message: AuthMessage.INVALID_TOKEN,
      errorKey: AuthMessage.INVALID_TOKEN
    })
  }
}
