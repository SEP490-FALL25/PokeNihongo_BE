import { FeatureKeyType } from '@/common/constants/subscription.constant'
import { UserSubscriptionRepo } from '@/modules/user-subscription/user-subscription.repo'
import { Injectable } from '@nestjs/common'

@Injectable()
export class SharedUserSubscriptionService {
  constructor(private userSubscriptionRepo: UserSubscriptionRepo) {}

  async getValueConvertByfeatureKeyAndUserId(featureKey: FeatureKeyType, userId: number) {
    const userSubs = await this.userSubscriptionRepo.findActiveByUserIdWithfeatureKey(
      userId,
      featureKey
    )

    if (!userSubs || userSubs.length === 0) {
      return 1
    }

    // Collect all feature values from all active subscriptions
    const values: number[] = []
    for (const us of userSubs) {
      const plan = (us as any).subscriptionPlan
      if (!plan || !plan.subscription || !plan.subscription.features) continue
      for (const sf of plan.subscription.features) {
        if (sf.value) {
          const parsed = parseFloat(sf.value)
          if (!isNaN(parsed)) {
            values.push(parsed)
          }
        }
      }
    }

    if (values.length === 0) {
      return 1
    }

    // Compute average
    const sum = values.reduce((acc, v) => acc + v, 0)
    return sum / values.length
  }

  async getHasByfeatureKeyAndUserId(featureKey: FeatureKeyType, userId: number) {
    const userSubs = await this.userSubscriptionRepo.findActiveByUserIdWithfeatureKey(
      userId,
      featureKey
    )

    if (!userSubs || userSubs.length === 0) {
      return false
    }

    // Check if any subscription has this feature
    for (const us of userSubs) {
      const plan = (us as any).subscriptionPlan
      if (!plan || !plan.subscription || !plan.subscription.features) continue
      if (plan.subscription.features.length > 0) {
        return true
      }
    }

    return false
  }
}
