import { UserAchievementMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class UserAchievementNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: UserAchievementMessage.NOT_FOUND,
      errorKey: UserAchievementMessage.NOT_FOUND
    })
  }
}

export class UserAchievementAlreadyExistsException extends BadRequestException {
  constructor() {
    super({
      message: UserAchievementMessage.ALREADY_EXISTS,
      errorKey: UserAchievementMessage.ALREADY_EXISTS
    })
  }
}

export class StatusClaimedException extends BadRequestException {
  constructor() {
    super({
      message: UserAchievementMessage.INVALID_STATUS_CLAIM,
      errorKey: UserAchievementMessage.INVALID_STATUS_CLAIM
    })
  }
}
