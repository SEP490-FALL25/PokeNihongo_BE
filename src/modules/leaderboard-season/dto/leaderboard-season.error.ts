import { LeaderboardSeasonMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException } from '@nestjs/common'

export class LeaderboardSeasonAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: LeaderboardSeasonMessage.ALREADY_EXISTS,
      errorKey: LeaderboardSeasonMessage.ALREADY_EXISTS
    })
  }
}

export class LeaderboardSeasonHasActiveException extends ConflictException {
  constructor() {
    super({
      message: LeaderboardSeasonMessage.HAS_ACTIVE,
      errorKey: LeaderboardSeasonMessage.HAS_ACTIVE
    })
  }
}

export class LeaderboardSeasonHasInvalidToActiveException extends ConflictException {
  constructor() {
    super({
      message: LeaderboardSeasonMessage.INVALID_DATA,
      errorKey: LeaderboardSeasonMessage.INVALID_DATA
    })
  }
}

export class LeaderboardSeasonHasOpenedException extends ConflictException {
  constructor() {
    super({
      message: LeaderboardSeasonMessage.HAS_OPENED,
      errorKey: LeaderboardSeasonMessage.HAS_OPENED
    })
  }
}

export class NotStartedLeaderboardSeasonException extends ConflictException {
  constructor() {
    super({
      message: LeaderboardSeasonMessage.NOT_STARTED,
      errorKey: LeaderboardSeasonMessage.NOT_STARTED
    })
  }
}

export class NewLeaderboardSeasonException extends BadRequestException {
  constructor() {
    super({
      message: LeaderboardSeasonMessage.NOT_JOIN_NEW_SEASON,
      errorKey: LeaderboardSeasonMessage.NOT_JOIN_NEW_SEASON
    })
  }
}
