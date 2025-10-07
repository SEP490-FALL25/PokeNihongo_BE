import { ELEMENTAL_TYPE_MESSAGE } from '@/common/constants/message'
import { ElementalTypeMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class ElementalTypeAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: ELEMENTAL_TYPE_MESSAGE.ALREADY_EXISTS,
      errorKey: ElementalTypeMessage.ALREADY_EXISTS
    })
  }
}
