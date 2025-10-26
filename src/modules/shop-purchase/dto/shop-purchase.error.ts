import { ShopPurchaseMessage, WalletMessage } from '@/i18n/message-keys'
import { NotFoundException } from '@nestjs/common'

export class ShopPurchaseNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: ShopPurchaseMessage.NOT_FOUND,
      errorKey: ShopPurchaseMessage.NOT_FOUND
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
