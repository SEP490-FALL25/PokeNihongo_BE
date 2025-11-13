import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { SubscriptionPlanController } from './subscription-plan.controller'
import { SubscriptionPlanRepo } from './subscription-plan.repo'
import { SubscriptionPlanService } from './subscription-plan.service'

@Module({
  imports: [LanguagesModule],
  controllers: [SubscriptionPlanController],
  providers: [SubscriptionPlanService, SubscriptionPlanRepo]
})
export class SubscriptionPlanModule {}
