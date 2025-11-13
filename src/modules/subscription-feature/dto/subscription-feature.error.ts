import { SubscriptionFeatureMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class SubscriptionFeatureNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: SubscriptionFeatureMessage.NOT_FOUND,
      errorKey: SubscriptionFeatureMessage.NOT_FOUND
    })
  }
}

export class SubscriptionFeatureAlreadyExistsException extends BadRequestException {
  constructor() {
    super({
      message: SubscriptionFeatureMessage.ALREADY_EXISTS,
      errorKey: SubscriptionFeatureMessage.ALREADY_EXISTS
    })
  }
}
