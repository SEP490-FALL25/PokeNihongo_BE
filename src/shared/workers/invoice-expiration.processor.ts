import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { InvoiceStatus } from '@/common/constants/invoice.constant'
import { UserSubscriptionStatus } from '@/common/constants/subscription.constant'
import {
  walletPurposeType,
  WalletTransactionSourceType,
  WalletTransactionType
} from '@/common/constants/wallet-transaction.constant'
import { walletType } from '@/common/constants/wallet.constant'
import { InvoiceRepo } from '@/modules/invoice/invoice.repo'
import { UserSubscriptionRepo } from '@/modules/user-subscription/user-subscription.repo'
import { WalletTransactionRepo } from '@/modules/wallet-transaction/wallet-transaction.repo'
import { WalletRepo } from '@/modules/wallet/wallet.repo'
import { Process, Processor } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { Job } from 'bull'

@Processor(BullQueue.INVOICE_EXPIRATION)
@Injectable()
export class InvoiceExpirationProcessor {
  private readonly logger = new Logger(InvoiceExpirationProcessor.name)
  constructor(
    private readonly invoiceRepo: InvoiceRepo,
    private readonly userSubscriptionRepo: UserSubscriptionRepo,
    private readonly walletRepo: WalletRepo,
    private readonly walletTransactionRepo: WalletTransactionRepo
  ) {}

  @Process(BullAction.EXPIRE_INVOICE)
  async handleExpireInvoice(job: Job<{ invoiceId: number }>) {
    const { invoiceId } = job.data
    try {
      const invoice = await this.invoiceRepo.findById(invoiceId)
      if (!invoice) {
        this.logger.warn(`Invoice ${invoiceId} not found for expiration job.`)
        return
      }
      if (invoice.status !== InvoiceStatus.PENDING) {
        // Already processed
        return
      }
      // Update invoice to CANCELLED
      await this.invoiceRepo.update({
        id: invoice.id,
        data: { status: InvoiceStatus.CANCELLED }
      })
      // Update related user subscription (if exists) to PAYMENT_FAILED
      const userSub = await this.userSubscriptionRepo.findByInvoiceId(invoice.id)
      if (userSub && userSub.status === UserSubscriptionStatus.PENDING_PAYMENT) {
        await this.userSubscriptionRepo.update({
          id: userSub.id,
          data: { status: UserSubscriptionStatus.PAYMENT_FAILED }
        })
      }

      // Refund PokeCoin nếu có discount
      if (invoice.discountAmount > 0) {
        const wallet = await this.walletRepo.findByUserIdAndType(
          invoice.userId,
          walletType.POKE_COINS
        )
        if (wallet) {
          await this.walletRepo.addBalanceToWalletWithType({
            userId: invoice.userId,
            type: walletType.POKE_COINS,
            amount: invoice.discountAmount
          })

          await this.walletTransactionRepo.create({
            createdById: invoice.userId,
            data: {
              walletId: wallet.id,
              userId: invoice.userId,
              purpose: walletPurposeType.REFUND,
              referenceId: invoice.id,
              amount: invoice.discountAmount,
              type: WalletTransactionType.INCREASE,
              source: WalletTransactionSourceType.ADMIN_ADJUST,
              description: null
            }
          })
          this.logger.log(
            `Refunded ${invoice.discountAmount} PokeCoin for invoice ${invoiceId}`
          )
        }
      }

      this.logger.log(`Expired invoice ${invoiceId} after timeout.`)
    } catch (err) {
      this.logger.error(`Failed to expire invoice ${invoiceId}: ${err?.message}`)
      throw err
    }
  }
}
