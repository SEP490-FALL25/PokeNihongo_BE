import { LEVEL_MESSAGE } from '@/common/constants/message'
import { ConflictException } from '@nestjs/common'

export const LevelAlreadyExistsException = new ConflictException(
  LEVEL_MESSAGE.ALREADY_EXISTS
)

export const ConflictTypeNextLevelException = new ConflictException(
  LEVEL_MESSAGE.CONFLICT_TYPE_NEXT_LEVEL
)
