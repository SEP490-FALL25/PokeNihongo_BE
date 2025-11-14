import {
  InvoiceStatus,
  PAYMENT_METHOD,
  PAYMENT_STATUS
} from '@/common/constants/invoice.constant'
import envConfig from '@/config/env.config'
// Legacy helpers không cần nữa cho invoice flow

import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { PayOSService } from '../../shared/services/payos.service'

import { I18nService } from '@/i18n/i18n.service'
import { PaymentMessage } from '@/i18n/message-keys'
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef
} from '@nestjs/common'
import { InvoiceRepo } from '../invoice/invoice.repo'
import { InvoiceService } from '../invoice/invoice.service'
import { SubscriptionPlanNotFoundException } from '../subscription-plan/dto/subscription-plan.error'
import { SubscriptionPlanRepo } from '../subscription-plan/subscription-plan.repo'
import { UserSubscriptionRepo } from '../user-subscription/user-subscription.repo'
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
    private readonly userSubscriptionRepo: UserSubscriptionRepo,
    private readonly payosService: PayOSService,
    private readonly userService: SharedUserRepository,
    private readonly i18nService: I18nService,
    @Inject(forwardRef(() => InvoiceService))
    private readonly invoiceService: InvoiceService
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

      // 2. Lấy subscription plan
      const plan = await this.subscriptionPlanRepo.getById(invoice.subscriptionPlanId)
      if (!plan) {
        throw new SubscriptionPlanNotFoundException()
      }

      // 3. Lấy thông tin user để fallback cho buyer info
      const user = await this.userService.findUnique({ id: userId })
      if (!user) {
        throw new NotFoundException('Không tìm thấy thông tin người dùng')
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
          redirect: `${feUrl}/payment/success?orderId=${payment.payosOrderId}&amount=${payment.amount}&plan=${encodeURIComponent(plan ? (plan.type === 'LIFETIME' ? 'Trọn đời' : `${plan.durationInDays || 0} ngày`) : '')}`
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
        this.sendMailPayment(payment)

        return {
          success: true,
          message: this.i18nService.translate(PaymentMessage.PAY_SUCCESS, lang),
          redirect: `${feUrl}/payment/success?orderId=${payment.payosOrderId}&amount=${payment.amount}&plan=${encodeURIComponent(plan ? (plan.type === 'LIFETIME' ? 'Trọn đời' : `${plan.durationInDays || 0} ngày`) : '')}`
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
  async sendMailPayment(_payment: PaymentType) {
    // EmailService chưa được triển khai trong hệ thống hiện tại -> bỏ qua
    return { skipped: true }
  }

  // (ĐÃ XOÁ) updateDateSubscription: không dùng cho Invoice + UserSubscription flow mới
}
