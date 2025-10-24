import { WalletMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class WalletAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: WalletMessage.ALREADY_EXISTS,
      errorKey: WalletMessage.ALREADY_EXISTS
    })
  }
}
