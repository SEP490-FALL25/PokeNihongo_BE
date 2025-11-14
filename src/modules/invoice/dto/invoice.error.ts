import { InvoiceMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class InvoiceNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: InvoiceMessage.NOT_FOUND,
      errorKey: InvoiceMessage.NOT_FOUND
    })
  }
}

export class InvoiceAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: InvoiceMessage.ALREADY_EXISTS,
      errorKey: InvoiceMessage.ALREADY_EXISTS
    })
  }
}
