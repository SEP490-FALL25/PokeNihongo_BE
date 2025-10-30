import { GachaPurchaseMessage, WalletMessage } from '@/i18n/message-keys'
import { NotFoundException } from '@nestjs/common'

export class GachaPurchaseNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: GachaPurchaseMessage.NOT_FOUND,
      errorKey: GachaPurchaseMessage.NOT_FOUND
    })
  }
}

//ko du tien liuliu
export class NotEnoughBalanceException extends NotFoundException {
  constructor() {
    super({
      message: WalletMessage.INSUFFICIENT_BALANCE,
      errorKey: WalletMessage.INSUFFICIENT_BALANCE
    })
  }
}
