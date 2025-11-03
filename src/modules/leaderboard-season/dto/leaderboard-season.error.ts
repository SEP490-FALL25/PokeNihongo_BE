import { LeaderboardSeasonMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class LeaderboardSeasonAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: LeaderboardSeasonMessage.ALREADY_EXISTS,
      errorKey: LeaderboardSeasonMessage.ALREADY_EXISTS
    })
  }
}
