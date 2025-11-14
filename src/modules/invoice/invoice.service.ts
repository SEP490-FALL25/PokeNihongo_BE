import { UserSubscriptionStatus } from '@/common/constants/subscription.constant'
import { I18nService } from '@/i18n/i18n.service'
import { InvoiceMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { InjectQueue } from '@nestjs/bull'
import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { Queue } from 'bull'
import { PaymentService } from '../payment/payment.service'
import { SubscriptionPlanNotFoundException } from '../subscription-plan/dto/subscription-plan.error'
import { SubscriptionPlanRepo } from '../subscription-plan/subscription-plan.repo'
import {
  UserHasSubscriptionWithStatusActiveException,
  UserHasSubscriptionWithStatusPendingPaymentException
} from '../user-subscription/dto/user-subscription.error'
import { UserSubscriptionRepo } from '../user-subscription/user-subscription.repo'
import { InvoiceNotFoundException } from './dto/invoice.error'
import { CreateInvoiceBodyType, UpdateInvoiceBodyType } from './entities/invoice.entity'
import { InvoiceRepo } from './invoice.repo'

@Injectable()
export class InvoiceService {
  constructor(
    private invoiceRepo: InvoiceRepo,
    private readonly subscriptionPlanRepo: SubscriptionPlanRepo,
    private readonly userSubRepo: UserSubscriptionRepo,
    private readonly i18nService: I18nService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    @InjectQueue('invoice-expiration') private readonly invoiceExpirationQueue: Queue
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.invoiceRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(InvoiceMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const invoice = await this.invoiceRepo.findById(id)
    if (!invoice) {
      throw new InvoiceNotFoundException()
    }

    return {
      statusCode: 200,
      data: invoice,
      message: this.i18nService.translate(InvoiceMessage.GET_LIST_SUCCESS, lang)
    }
  }
  async create(
    { userId, data }: { userId: number; data: CreateInvoiceBodyType },
    lang: string = 'vi'
  ) {
    try {
      // check xem goi plan co active ko
      const isPlanExist = await this.subscriptionPlanRepo.getById(data.subscriptionPlanId)
      if (!isPlanExist) {
        throw new SubscriptionPlanNotFoundException()
      }
      if (isPlanExist.isActive === false) {
        throw new SubscriptionPlanNotFoundException()
      }

      // xem user mua goi nay co dang active khong, neu co goi nay va dang active thi khong duoc mua nua
      const isUserActivePlanExist =
        await this.userSubRepo.findActiveByUserIdPlanIdAndStatus(
          userId,
          data.subscriptionPlanId,
          UserSubscriptionStatus.ACTIVE
        )
      if (isUserActivePlanExist) {
        throw new UserHasSubscriptionWithStatusActiveException()
      }
      // xem user co dang thanh toan goi nay khong
      const isUserPayPlanExist = await this.userSubRepo.findActiveByUserIdPlanIdAndStatus(
        userId,
        data.subscriptionPlanId,
        UserSubscriptionStatus.PENDING_PAYMENT
      )
      if (isUserPayPlanExist) {
        throw new UserHasSubscriptionWithStatusPendingPaymentException()
      }

      // Tạo invoice trong transaction
      const invoice = await this.invoiceRepo.withTransaction(async (tx) => {
        // chuan bi them data co create invoice
        const subtotalAmount = isPlanExist.price
        const discountAmount = data.discountAmount || 0
        const totalAmount = subtotalAmount - discountAmount

        return await this.invoiceRepo.create(
          {
            createdById: userId,
            data: {
              ...data,
              subtotalAmount,
              discountAmount,
              totalAmount,
              userId
            }
          },
          tx
        )
      })

      // Schedule auto cancellation after 60 minutes if still PENDING
      await this.invoiceExpirationQueue.add(
        'expireInvoice',
        { invoiceId: invoice.id },
        {
          delay: 60 * 60 * 1000,
          jobId: `invoice-expire-${invoice.id}`,
          removeOnComplete: true,
          removeOnFail: true
        }
      )

      // Sau khi invoice đã commit vào DB, gọi createPayOSPayment
      const paymentResult = await this.paymentService.createPayOSPayment(
        {
          invoiceId: invoice.id
        },
        userId,
        lang
      )

      return {
        statusCode: 201,
        data: {
          invoice,
          payment: paymentResult.data
        },
        message: this.i18nService.translate(InvoiceMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: UpdateInvoiceBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      // Update invoice trong transaction
      const invoice = await this.invoiceRepo.withTransaction(async (tx) => {
        return await this.invoiceRepo.update(
          {
            id,
            data: data,
            updatedById: userId
          },
          tx
        )
      })

      return {
        statusCode: 200,
        data: invoice,
        message: this.i18nService.translate(InvoiceMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new InvoiceNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existInvoice = await this.invoiceRepo.findById(id)
      if (!existInvoice) {
        throw new InvoiceNotFoundException()
      }

      await this.invoiceRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(InvoiceMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new InvoiceNotFoundException()
      }
      throw error
    }
  }

  async updateInvoiceWhenPaymentSuccess(invoiceId: number) {
    const invoice = await this.invoiceRepo.findById(invoiceId)
    if (!invoice) {
      throw new InvoiceNotFoundException()
    }

    // Remove scheduled expiration job if exists
    const jobId = `invoice-expire-${invoiceId}`
    const existingJob = await this.invoiceExpirationQueue.getJob(jobId)
    if (existingJob) {
      await existingJob.remove()
    }

    // If already paid, just ensure subscription exists/updated
    const isAlreadyPaid = invoice.status === 'PAID'
    if (!isAlreadyPaid) {
      await this.invoiceRepo.update({ id: invoiceId, data: { status: 'PAID' } })
    }

    // Create or update user subscription linked by invoiceId
    const existingUserSub = await this.userSubRepo.findByInvoiceId(invoiceId)
    const plan = await this.subscriptionPlanRepo.getById(invoice.subscriptionPlanId)
    if (!plan) {
      // If plan missing, nothing more to do
      return
    }
    const now = new Date()
    const expiresAt =
      plan.type === 'RECURRING' && plan.durationInDays
        ? new Date(now.getTime() + plan.durationInDays * 86400000)
        : null

    if (!existingUserSub) {
      const created = await this.userSubRepo.create({
        createdById: invoice.userId,
        data: {
          subscriptionPlanId: plan.id,
          invoiceId: invoice.id,
          userId: invoice.userId
        }
      })
      await this.userSubRepo.update({
        id: created.id,
        data: { startDate: now, expiresAt, status: UserSubscriptionStatus.ACTIVE }
      })
    } else {
      // Update if not already ACTIVE
      if (existingUserSub.status !== UserSubscriptionStatus.ACTIVE) {
        await this.userSubRepo.update({
          id: existingUserSub.id,
          data: { startDate: now, expiresAt, status: UserSubscriptionStatus.ACTIVE }
        })
      }
    }
  }
}
