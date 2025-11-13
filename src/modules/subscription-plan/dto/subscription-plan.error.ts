import { SubscriptionPlanMessage } from '@/i18n/message-keys'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export class SubscriptionPlanNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: SubscriptionPlanMessage.NOT_FOUND,
      errorKey: SubscriptionPlanMessage.NOT_FOUND
    })
  }
}

export class SubscriptionPlanAlreadyExistsException extends BadRequestException {
  constructor() {
    super({
      message: SubscriptionPlanMessage.ALREADY_EXISTS,
      errorKey: SubscriptionPlanMessage.ALREADY_EXISTS
    })
  }
}
