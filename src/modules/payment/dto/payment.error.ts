import { InvoiceMessage, PaymentMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class InvoiceNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: InvoiceMessage.NOT_FOUND,
      errorKey: InvoiceMessage.NOT_FOUND
    })
  }
}

export class InvalidStatusPendingInvoiceToPayException extends ConflictException {
  constructor() {
    super({
      message: PaymentMessage.INVALID_STATUS_PENDING,
      errorKey: PaymentMessage.INVALID_STATUS_PENDING
    })
  }
}

export class ErrorPaymentToPayException extends ConflictException {
  constructor() {
    super({
      message: PaymentMessage.ERROR_UNKNOWN_PAY,
      errorKey: PaymentMessage.ERROR_UNKNOWN_PAY
    })
  }
}
