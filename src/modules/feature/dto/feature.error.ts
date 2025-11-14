import { FeatureMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class FeatureAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: FeatureMessage.ALREADY_EXISTS,
      errorKey: FeatureMessage.ALREADY_EXISTS
    })
  }
}

export class FeatureHasInvalidToActiveException extends ConflictException {
  constructor() {
    super({
      message: FeatureMessage.INVALID_DATA,
      errorKey: FeatureMessage.INVALID_DATA
    })
  }
}
