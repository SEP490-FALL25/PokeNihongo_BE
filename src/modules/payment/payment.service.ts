import {
  InvoiceStatus,
  PAYMENT_METHOD,
  PAYMENT_STATUS
} from '@/common/constants/invoice.constant'
import envConfig from '@/config/env.config'
// Legacy helpers không cần nữa cho invoice flow

import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { PayOSService } from '../../shared/services/payos.service'

import { MailService } from '@/3rdService/mail/mail.service'
import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { I18nService } from '@/i18n/i18n.service'
import { PaymentMessage, SendMailMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import { InjectQueue } from '@nestjs/bull'
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef
} from '@nestjs/common'
import { Queue } from 'bull'
import { InvoiceRepo } from '../invoice/invoice.repo'
import { InvoiceService } from '../invoice/invoice.service'
import { SubscriptionPlanNotFoundException } from '../subscription-plan/dto/subscription-plan.error'
import { SubscriptionPlanRepo } from '../subscription-plan/subscription-plan.repo'
import { UserSubscriptionService } from '../user-subscription/user-subscription.service'
import {
  ErrorPaymentToPayException,
  InvalidStatusPendingInvoiceToPayException,
  InvoiceNotFoundException
} from './dto/payment.error'
import { CreatePayOSPaymentDto, PaymentType } from './entities/payment.model'
import { PaymentRepo } from './payment.repo'

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepo: PaymentRepo,
    private readonly invoiceRepo: InvoiceRepo,
    private readonly subscriptionPlanRepo: SubscriptionPlanRepo,
    private readonly userSubscriptionSer: UserSubscriptionService,
    private readonly payosService: PayOSService,
    private readonly userService: SharedUserRepository,
    private readonly i18nService: I18nService,
    private readonly mailService: MailService,
    @Inject(forwardRef(() => InvoiceService))
    private readonly invoiceService: InvoiceService,
    @InjectQueue(BullQueue.INVOICE_EXPIRATION)
    private readonly invoiceExpirationQueue: Queue
  ) {}
  // Create PayOS payment
  async createPayOSPayment(
    paymentData: CreatePayOSPaymentDto,
    userId: number,
    lang: string = 'vi'
  ) {
    try {
      const { invoiceId, buyerName, buyerEmail, buyerPhone } = paymentData
      console.log('create -payment')

      // 1. Lấy invoice
      const invoice = await this.invoiceRepo.findById(invoiceId)
      if (!invoice) {
        throw new InvoiceNotFoundException()
      }

      if (invoice.status !== InvoiceStatus.PENDING) {
        throw new InvalidStatusPendingInvoiceToPayException()
      }

      // 1.1. Nếu đã có payment PENDING còn hạn cho invoice này thì trả về luôn
      const existingPending = await this.paymentRepo.findLatestPendingByInvoice(
        invoice.id
      )
      if (existingPending) {
        const now = Date.now()
        const expiredAtMs = existingPending.expiredAt
          ? new Date(existingPending.expiredAt).getTime()
          : undefined
        if (expiredAtMs && expiredAtMs > now) {
          return {
            success: true,
            message: this.i18nService.translate(PaymentMessage.CREATE_SUCCESS, lang),
            data: {
              payment: existingPending,
              payosData: {
                orderCode: existingPending.payosOrderId
                  ? Number(existingPending.payosOrderId)
                  : undefined,
                checkoutUrl: existingPending.payosCheckoutUrl,
                qrCode: existingPending.payosQrCode,
                paymentLinkId: existingPending.payosPaymentLinkId,
                expiredAt: expiredAtMs ? Math.floor(expiredAtMs / 1000) : undefined,
                amount: existingPending.amount
              }
            }
          }
        } else if (expiredAtMs && expiredAtMs <= now) {
          await this.paymentRepo.updatePayment(existingPending.id, {
            status: PAYMENT_STATUS.EXPIRED,
            failureReason: 'Payment link expired'
          })
        }
      }

      // 2. Lấy subscription plan
      const plan = await this.subscriptionPlanRepo.getById(invoice.subscriptionPlanId)
      if (!plan) {
        throw new SubscriptionPlanNotFoundException()
      }

      // 3. Lấy thông tin user để fallback cho buyer info
      const user = await this.userService.findUnique({ id: userId })
      if (!user) {
        throw new NotFoundRecordException()
      }

      // Sử dụng thông tin từ paymentData hoặc fallback từ user
      const finalBuyerName = buyerName || user.name || 'Unknown'
      const finalBuyerEmail = buyerEmail || user.email
      const finalBuyerPhone = buyerPhone || user.phoneNumber || ''

      // 4. Tạo orderCode duy nhất cho PayOS
      const orderCode = this.payosService.generateOrderCode()

      // 5. Tạo return/cancel URL
      const { returnUrl, cancelUrl } = this.payosService.generatePaymentUrls(invoice.id)

      // 6. Sinh danh sách items (hiển thị trên PayOS)
      const items = this.payosService.createPayOSItems({ invoice, plan })

      // 7. Tổng tiền lấy từ invoice.totalAmount (đã trừ giảm giá nếu có)
      // Chuẩn hóa về số nguyên VND theo yêu cầu PayOS
      const amount = Math.round(invoice.totalAmount)

      // 8. Chuẩn bị request tới PayOS
      const payosRequest = {
        orderCode,
        amount,
        description: `${plan.type === 'LIFETIME' ? 'Lifetime' : `Recurring`}`,
        items,
        buyerName: finalBuyerName,
        buyerEmail: finalBuyerEmail,
        buyerPhone: finalBuyerPhone,
        cancelUrl,
        returnUrl,
        expiredAt: Math.floor(Date.now() / 1000) + 15 * 60 // 15 phút
      }

      // 9. Gọi PayOS tạo link
      const payosResponse = await this.payosService.createPaymentLink(payosRequest)

      // 10. Lưu Payment (PENDING)
      const payment = await this.paymentRepo.createPayment({
        userId,
        invoiceId: invoice.id,
        paymentMethod: PAYMENT_METHOD.BANK_TRANSFER,
        amount,
        status: PAYMENT_STATUS.PENDING,
        payosOrderId: orderCode.toString(),
        payosPaymentLinkId: payosResponse.paymentLinkId,
        payosCheckoutUrl: payosResponse.checkoutUrl,
        payosQrCode: payosResponse.qrCode,
        expiredAt: new Date(payosResponse.expiredAt * 1000),
        processedById: userId
      })

      // 11. Kiểm tra và gia hạn Bull job nếu còn < 15 phút
      const jobId = `invoice-expire-${invoice.id}`
      const existingJob = await this.invoiceExpirationQueue.getJob(jobId)
      if (existingJob) {
        const now = Date.now()
        const jobDelay = existingJob.opts.delay || 0
        const jobCreatedAt = existingJob.timestamp
        const timeRemaining = jobCreatedAt + jobDelay - now
        const fifteenMinutes = 15 * 60 * 1000

        if (timeRemaining < fifteenMinutes) {
          // Xóa job cũ và tạo lại với delay 15 phút
          await existingJob.remove()
          await this.invoiceExpirationQueue.add(
            BullAction.EXPIRE_INVOICE,
            { invoiceId: invoice.id },
            {
              delay: fifteenMinutes,
              jobId,
              removeOnComplete: true,
              removeOnFail: true
            }
          )
        }
      }

      return {
        success: true,
        message: this.i18nService.translate(PaymentMessage.CREATE_SUCCESS, lang),
        data: {
          payment,
          payosData: {
            orderCode: payosResponse.orderCode,
            checkoutUrl: payosResponse.checkoutUrl,
            qrCode: payosResponse.qrCode,
            paymentLinkId: payosResponse.paymentLinkId,
            expiredAt: payosResponse.expiredAt,
            amount: payosResponse.amount
          }
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error
      }
      throw new ErrorPaymentToPayException()
    }
  }

  // Handle PayOS return URL
  async handlePayOSReturn(
    returnData: {
      paymentId: number
      code: string
      paymentLinkId: string
      cancel: boolean
      status: string
      orderCode: number
    },
    lang: string = 'vi'
  ) {
    const feUrl = envConfig.FE_URL || 'http://localhost:3000'
    try {
      const { paymentId, code, paymentLinkId, cancel, status, orderCode } = returnData

      console.log('return: ', returnData)

      // Tìm payment theo orderCode
      const payment = (await this.paymentRepo.findPaymentByPayOSOrderId(
        orderCode.toString()
      )) as PaymentType | null

      if (!payment) {
        // Redirect về frontend với error
        return {
          success: false,
          message: this.i18nService.translate(PaymentMessage.NOT_FOUND, lang),
          redirect: `${feUrl}/payment/failed?error=payment_not_found&orderCode=${orderCode}`
        }
      }

      // Nếu đã thanh toán thành công trước đó
      if (payment.status === PAYMENT_STATUS.PAID) {
        // Lấy thêm thông tin subscription và service plan cho redirect
        const invoice = await this.invoiceRepo.findById(payment.invoiceId)
        const plan = invoice
          ? await this.subscriptionPlanRepo.getById(invoice.subscriptionPlanId)
          : null

        return {
          success: true,
          message: this.i18nService.translate(PaymentMessage.ALREADY_PAID, lang),
          redirect: `${feUrl}/payment/success?orderId=${payment.payosOrderId}&amount=${payment.amount}&plan=${encodeURIComponent(plan ? (plan.type === 'LIFETIME' ? 'Lifetime' : `Recurring`) : '')}`
        }
      }

      // Xử lý theo code trả về từ PayOS
      if (code === '00' && status === 'PAID' && !cancel) {
        // Lấy thông tin subscription và service plan
        const invoice = await this.invoiceRepo.findById(payment.invoiceId)
        const plan = invoice
          ? await this.subscriptionPlanRepo.getById(invoice.subscriptionPlanId)
          : null

        // Thanh toán thành công: cập nhật payment + invoice
        await this.paymentRepo.markInvoicePaid(payment.id, payment.invoiceId)

        // Delegate subscription creation + job cleanup to invoice service
        await this.invoiceService.updateInvoiceWhenPaymentSuccess(payment.invoiceId)
        //todo mail
        // Gửi mail (tạm thời no-op)
        this.sendMailPayment(payment.invoiceId)

        return {
          success: true,
          message: this.i18nService.translate(PaymentMessage.PAY_SUCCESS, lang),
          redirect: `${feUrl}/payment/success?orderId=${payment.payosOrderId}&amount=${payment.amount}&plan=${encodeURIComponent(plan ? (plan.type === 'LIFETIME' ? 'Lifetime' : `Recurring`) : '')}`
        }
      } else {
        // Thanh toán thất bại hoặc bị hủy
        const failureReason = cancel
          ? this.i18nService.translate(PaymentMessage.PAY_CANCELLED, lang)
          : this.i18nService.translate(PaymentMessage.PAY_FAILED, lang)

        await this.paymentRepo.updatePayment(payment.id, {
          status: cancel ? PAYMENT_STATUS.CANCELLED : PAYMENT_STATUS.FAILED,
          failureReason,
          gatewayResponse: returnData as any
        })

        return {
          success: false,
          message: failureReason,
          redirect: `${feUrl}/payment/failed?error=payment_failed&orderCode=${orderCode}&reason=${encodeURIComponent(failureReason)}`
        }
      }
    } catch (error) {
      console.error('PayOS Return Handler Error:', error)
      return {
        success: false,
        message: this.i18nService.translate(PaymentMessage.ERROR_UNKNOWN_PAY, lang),
        redirect: `${feUrl}/payment/failed?error=system_error&orderCode=${returnData.orderCode}`
      }
    }
  }

  // Handle PayOS cancel URL
  async handlePayOSCancel(
    cancelData: {
      paymentId: number
      code: string
      paymentLinkId: string
      cancel: boolean
      status: string
      orderCode: number
    },
    lang: string = 'vi'
  ) {
    const feUrl = envConfig.FE_URL || 'http://localhost:3000'
    try {
      const { paymentId, orderCode } = cancelData
      console.log(
        'Handling PayOS cancel for paymentId:',
        paymentId,
        'orderCode:',
        orderCode
      )

      // Tìm payment theo orderCode
      const payment = await this.paymentRepo.findPaymentByPayOSOrderId(
        orderCode.toString()
      )

      if (payment && payment.status === PAYMENT_STATUS.PENDING) {
        // Cập nhật trạng thái hủy
        await this.paymentRepo.updatePayment(payment.id, {
          status: PAYMENT_STATUS.CANCELLED,
          failureReason: this.i18nService.translate(PaymentMessage.PAY_CANCELLED, lang),
          gatewayResponse: cancelData as any
        })
        // dong thoi cập nhật invoice hủy luôn
        await this.invoiceRepo.update({
          id: payment.invoiceId,
          data: {
            status: InvoiceStatus.CANCELLED
          }
        })
      }

      return {
        success: false,
        message: this.i18nService.translate(PaymentMessage.PAY_CANCELLED, lang),
        redirect: `${feUrl}/payment/failed?error=payment_cancelled&orderCode=${orderCode}`
      }
    } catch (error) {
      console.error('PayOS Cancel Handler Error:', error)
      return {
        success: false,
        message: this.i18nService.translate(PaymentMessage.ERROR_UNKNOWN_PAY, lang),
        redirect: `${feUrl}/payment/failed?error=system_error&orderCode=${cancelData.orderCode}`
      }
    }
  }

  //todo mail
  async sendMailPayment(invoiceId: number) {
    // EmailService chưa được triển khai trong hệ thống hiện tại -> bỏ qua
    // lấy ra thông tin userSubscription
    const userSubscription =
      await this.userSubscriptionSer.getInforSubAndInvoiceWithUserSubId(invoiceId, 'vi')

    await this.mailService.sendSubscriptionSuccessVendorEmail(
      userSubscription.data.user.email,
      userSubscription.data.user.name,
      {
        subscriptionPlanId: userSubscription.data.userSubscriptionId.toString(),
        planName: userSubscription.data.planName || 'Unknown',
        startDate: userSubscription.data.startDate,
        endDate: userSubscription.data.expiresAt,
        status: userSubscription.data.status,
        price: userSubscription.data.subtotalAmount,
        paymentMethod: userSubscription.data.paymentMethod,
        discountAmount: userSubscription.data.discountAmount,
        totalAmount: userSubscription.data.totalAmount
      },
      SendMailMessage.REGISTER_SUBSCRIPTION_SUCCESS
    )
    return { skipped: true }
  }

  // (ĐÃ XOÁ) updateDateSubscription: không dùng cho Invoice + UserSubscription flow mới
}
