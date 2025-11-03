import { REWARD_MESSAGE } from '@/common/constants/message'
import { DebuffRoundMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class DebuffRoundAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: REWARD_MESSAGE.ALREADY_EXISTS,
      errorKey: DebuffRoundMessage.ALREADY_EXISTS
    })
  }
}
