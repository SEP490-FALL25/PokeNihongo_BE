import { Module, forwardRef } from '@nestjs/common'
import { PaymentModule } from '../payment/payment.module'
import { SubscriptionPlanModule } from '../subscription-plan/subscription-plan.module'
import { UserSubscriptionModule } from '../user-subscription/user-subscription.module'
import { WalletTransactionModule } from '../wallet-transaction/wallet-transaction.module'
import { WalletModule } from '../wallet/wallet.module'
import { InvoiceController } from './invoice.controller'
import { InvoiceRepo } from './invoice.repo'
import { InvoiceService } from './invoice.service'

@Module({
  imports: [
    SubscriptionPlanModule,
    UserSubscriptionModule,
    forwardRef(() => PaymentModule),
    WalletModule,
    WalletTransactionModule
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceRepo],
  exports: [InvoiceService, InvoiceRepo]
})
export class InvoiceModule {}
