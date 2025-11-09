import { SeasonRankRewardMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class SeasonRankRewardNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: SeasonRankRewardMessage.NOT_FOUND,
      errorKey: SeasonRankRewardMessage.NOT_FOUND
    })
  }
}

export class SeasonRankRewardAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: SeasonRankRewardMessage.ALREADY_EXISTS,
      errorKey: SeasonRankRewardMessage.ALREADY_EXISTS
    })
  }
}
