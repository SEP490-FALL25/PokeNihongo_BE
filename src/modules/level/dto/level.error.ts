import { LEVEL_MESSAGE } from '@/common/constants/message'
import { LevelMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class LevelAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: LEVEL_MESSAGE.ALREADY_EXISTS,
      errorKey: LevelMessage.ALREADY_EXISTS
    })
  }
}

export class ConflictTypeNextLevelException extends ConflictException {
  constructor() {
    super({
      message: LEVEL_MESSAGE.CONFLICT_TYPE_NEXT_LEVEL,
      errorKey: LevelMessage.CONFLICT_TYPE_NEXT_LEVEL
    })
  }
}
