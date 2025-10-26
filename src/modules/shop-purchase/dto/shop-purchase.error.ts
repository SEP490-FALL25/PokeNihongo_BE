import { ShopPurchaseMessage, WalletMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

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

// Đã đạt giới hạn mua
export class PurchaseLimitReachedException extends BadRequestException {
  constructor() {
    super({
      message: ShopPurchaseMessage.PURCHASE_LIMIT_REACHED,
      errorKey: ShopPurchaseMessage.PURCHASE_LIMIT_REACHED
    })
  }
}

// Chưa có pokemon tiền nhiệm
export class MissingPreviousPokemonException extends BadRequestException {
  constructor() {
    super({
      message: ShopPurchaseMessage.MISSING_PREVIOUS_POKEMON,
      errorKey: ShopPurchaseMessage.MISSING_PREVIOUS_POKEMON
    })
  }
}
