import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class AttendenceConfigAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: ENTITY_MESSAGE.ALREADY_EXISTS,
      errorKey: ENTITY_MESSAGE.ALREADY_EXISTS
    })
  }
}
