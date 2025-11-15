import { Module, forwardRef } from '@nestjs/common'
import { InvoiceModule } from '../invoice/invoice.module'
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module'
import { UserSubscriptionModule } from '../user-subscription/user-subscription.module'
import { PaymentController } from './payment.controller'
import { PaymentRepo } from './payment.repo'
import { PaymentService } from './payment.service'

@Module({
  imports: [
    forwardRef(() => InvoiceModule),
    SubscriptionPlanModule,
    UserSubscriptionModule
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentRepo],
  exports: [PaymentService, PaymentRepo]
})
export class PaymentModule {}
