import { Module } from '@nestjs/common'
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module'
import { UserSubscriptionController } from './user-subscription.controller'
import { UserSubscriptionRepo } from './user-subscription.repo'
import { UserSubscriptionService } from './user-subscription.service'

@Module({
  imports: [SubscriptionPlanModule],
  controllers: [UserSubscriptionController],
  providers: [UserSubscriptionService, UserSubscriptionRepo],
  exports: [UserSubscriptionService, UserSubscriptionRepo]
})
export class UserSubscriptionModule {}
