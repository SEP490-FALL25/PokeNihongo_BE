import { Module } from '@nestjs/common'
import { UserSubscriptionController } from './user-subscription.controller'
import { UserSubscriptionRepo } from './user-subscription.repo'
import { UserSubscriptionService } from './user-subscription.service'

@Module({
  controllers: [UserSubscriptionController],
  providers: [UserSubscriptionService, UserSubscriptionRepo]
})
export class UserSubscriptionModule {}
