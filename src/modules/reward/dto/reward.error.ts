import { REWARD_MESSAGE } from '@/common/constants/message'
import { RewardMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class RewardAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: REWARD_MESSAGE.ALREADY_EXISTS,
      errorKey: RewardMessage.ALREADY_EXISTS
    })
  }
}
