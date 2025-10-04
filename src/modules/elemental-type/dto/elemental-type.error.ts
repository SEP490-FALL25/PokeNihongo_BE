import { ELEMENTAL_TYPE_MESSAGE } from '@/common/constants/message'
import { ConflictException } from '@nestjs/common'

export const ElementalTypeAlreadyExistsException = new ConflictException(
  ELEMENTAL_TYPE_MESSAGE.ALREADY_EXISTS
)
