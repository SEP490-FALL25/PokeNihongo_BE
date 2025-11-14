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

export class SubscriptionPlanNotReadyToBuyException extends NotFoundException {
  constructor() {
    super({
      message: SubscriptionPlanMessage.NOT_READY_TO_BUY,
      errorKey: SubscriptionPlanMessage.NOT_READY_TO_BUY
    })
  }
}
