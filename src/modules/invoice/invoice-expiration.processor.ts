import { InvoiceStatus } from '@/common/constants/invoice.constant'
import { UserSubscriptionStatus } from '@/common/constants/subscription.constant'
import { Process, Processor } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { Job } from 'bull'
import { UserSubscriptionRepo } from '../user-subscription/user-subscription.repo'
import { InvoiceRepo } from './invoice.repo'

@Processor('invoice-expiration')
@Injectable()
export class InvoiceExpirationProcessor {
  private readonly logger = new Logger(InvoiceExpirationProcessor.name)
  constructor(
    private readonly invoiceRepo: InvoiceRepo,
    private readonly userSubscriptionRepo: UserSubscriptionRepo
  ) {}

  @Process('expireInvoice')
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
      this.logger.log(`Expired invoice ${invoiceId} after timeout.`)
    } catch (err) {
      this.logger.error(`Failed to expire invoice ${invoiceId}: ${err?.message}`)
      throw err
    }
  }
}
