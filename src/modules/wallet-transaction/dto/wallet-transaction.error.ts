import { WalletTransactionMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class WalletTransactionAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: WalletTransactionMessage.ALREADY_EXISTS,
      errorKey: WalletTransactionMessage.ALREADY_EXISTS
    })
  }
}
