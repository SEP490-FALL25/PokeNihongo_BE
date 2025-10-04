import { TYPE_EFFECTIVENESS_MESSAGE } from '@/common/constants/message'
import { ConflictException } from '@nestjs/common'

export const TypeEffectivenessAlreadyExistsException = new ConflictException(
  TYPE_EFFECTIVENESS_MESSAGE.ALREADY_EXISTS
)
