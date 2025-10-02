import { REWARD_MESSAGE } from '@/common/constants/message'
import { ConflictException } from '@nestjs/common'

export const RewardAlreadyExistsException = new ConflictException(
  REWARD_MESSAGE.ALREADY_EXISTS
)
