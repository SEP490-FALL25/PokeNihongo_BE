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

export class InvalidValueForCoinMultiplierExistsException extends BadRequestException {
  constructor() {
    super({
      message: SubscriptionFeatureMessage.INVALID_COIN_MULTIPLIER_VALUE,
      errorKey: SubscriptionFeatureMessage.INVALID_COIN_MULTIPLIER_VALUE
    })
  }
}

export class InvalidValueForXPMultiplierExistsException extends BadRequestException {
  constructor() {
    super({
      message: SubscriptionFeatureMessage.INVALID_XP_MULTIPLIER_VALUE,
      errorKey: SubscriptionFeatureMessage.INVALID_XP_MULTIPLIER_VALUE
    })
  }
}
