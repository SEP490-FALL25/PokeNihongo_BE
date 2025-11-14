import { Module } from '@nestjs/common'
import { FeatureModule } from '../feature/feature.module'
import { SubscriptionModule } from '../subscription/subscription.module'
import { SubscriptionFeatureController } from './subscription-feature.controller'
import { SubscriptionFeatureRepo } from './subscription-feature.repo'
import { SubscriptionFeatureService } from './subscription-feature.service'

@Module({
  imports: [SubscriptionModule, FeatureModule],
  controllers: [SubscriptionFeatureController],
  providers: [SubscriptionFeatureService, SubscriptionFeatureRepo],
  exports: [SubscriptionFeatureService, SubscriptionFeatureRepo]
})
export class SubscriptionFeatureModule {}
