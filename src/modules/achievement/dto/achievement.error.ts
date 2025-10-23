import { AchievementMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class AchievementAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: AchievementMessage.ALREADY_EXISTS,
      errorKey: AchievementMessage.ALREADY_EXISTS
    })
  }
}
