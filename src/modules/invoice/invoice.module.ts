import { BullModule } from '@nestjs/bull'
import { Module, forwardRef } from '@nestjs/common'
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module'
import { UserSubscriptionModule } from '../user-subscription/user-subscription.module'
import { InvoiceController } from './invoice.controller'
import { InvoiceRepo } from './invoice.repo'
import { InvoiceService } from './invoice.service'

@Module({
  imports: [
    SubscriptionPlanModule,
    UserSubscriptionModule,
    forwardRef(() => require('../payment/payment.module').PaymentModule),
    BullModule.registerQueue({ name: 'invoice-expiration' })
  ],
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceRepo,
    require('./invoice-expiration.processor').InvoiceExpirationProcessor
  ],
  exports: [InvoiceService, InvoiceRepo]
})
export class InvoiceModule {}
