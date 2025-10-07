import { TYPE_EFFECTIVENESS_MESSAGE } from '@/common/constants/message'
import { TypeEffectivenessMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class TypeEffectivenessAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: TYPE_EFFECTIVENESS_MESSAGE.ALREADY_EXISTS,
      errorKey: TypeEffectivenessMessage.ALREADY_EXISTS
    })
  }
}
