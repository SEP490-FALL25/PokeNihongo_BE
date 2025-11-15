import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { WalletModule } from '../wallet/wallet.module'
import { SubscriptionPlanController } from './subscription-plan.controller'
import { SubscriptionPlanRepo } from './subscription-plan.repo'
import { SubscriptionPlanService } from './subscription-plan.service'

@Module({
  imports: [LanguagesModule, WalletModule],
  controllers: [SubscriptionPlanController],
  providers: [SubscriptionPlanService, SubscriptionPlanRepo],
  exports: [SubscriptionPlanService, SubscriptionPlanRepo]
})
export class SubscriptionPlanModule {}
