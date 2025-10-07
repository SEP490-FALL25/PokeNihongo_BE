import { UnprocessableEntityException } from '@nestjs/common'
import { PermissionMessage } from 'src/i18n/message-keys'

export class PermissionAlreadyExistsException extends UnprocessableEntityException {
  constructor() {
    super({
      message: 'Permission already exists',
      errorKey: PermissionMessage.ALREADY_EXISTS
    })
  }
}
