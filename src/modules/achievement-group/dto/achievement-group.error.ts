import { AchievementGroupMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class AchievementGroupAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: AchievementGroupMessage.ALREADY_EXISTS,
      errorKey: AchievementGroupMessage.ALREADY_EXISTS
    })
  }
}
