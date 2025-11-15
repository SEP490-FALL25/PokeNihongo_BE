import envConfig from '@/config/env.config'

import { InvoiceType } from '@/modules/invoice/entities/invoice.entity'
import { SubscriptionPlanType } from '@/modules/subscription-plan/entities/subscription-plan.entity'
import { Injectable, Logger } from '@nestjs/common'
import { PayOS } from '@payos/node'
import { ErrorUnknowWithPayOSSystemException } from '../error'

// PayOS Types từ documentation
export interface PayOSItemData {
  name: string
  quantity: number
  price: number
}

export interface PayOSCheckoutRequest {
  orderCode: number
  amount: number
  description: string
  items?: PayOSItemData[]
  buyerName?: string
  buyerEmail?: string
  buyerPhone?: string
  buyerAddress?: string
  cancelUrl: string
  returnUrl: string
  signature?: string
  expiredAt?: number
}

export interface PayOSCheckoutResponse {
  bin: string
  accountNumber: string
  accountName: string
  amount: number
  description: string
  orderCode: number
  currency: string
  paymentLinkId: string
  status: string
  expiredAt: number
  checkoutUrl: string
  qrCode: string
}

export interface PayOSPaymentLinkInfo {
  id: string
  orderCode: number
  amount: number
  amountPaid: number
  amountRemaining: number
  status: string
  createdAt: string
  transactions: PayOSTransaction[]
  cancellationReason?: string | null
  canceledAt?: string | null
}

export interface PayOSTransaction {
  reference: string
  amount: number
  accountNumber: string
  description: string
  transactionDateTime: string
  virtualAccountName?: string | null
  virtualAccountNumber?: string | null
  counterAccountBankId?: string | null
  counterAccountBankName?: string | null
  counterAccountName?: string | null
  counterAccountNumber?: string | null
}

export interface PayOSWebhookData {
  orderCode: number
  amount: number
  description: string
  accountNumber: string
  reference: string
  transactionDateTime: string
  currency: string
  paymentLinkId: string
  code: string
  desc: string
  counterAccountBankId?: string | null
  counterAccountBankName?: string | null
  counterAccountName?: string | null
  counterAccountNumber?: string | null
  virtualAccountName?: string | null
  virtualAccountNumber?: string | null
}

@Injectable()
export class PayOSService {
  private readonly logger = new Logger(PayOSService.name)
  private readonly payOS: PayOS

  constructor() {
    // Khởi tạo PayOS client v2.x
    this.payOS = new PayOS({
      clientId: envConfig.PAYOS_CLIENT_ID,
      apiKey: envConfig.PAYOS_API_KEY,
      checksumKey: envConfig.PAYOS_CHECKSUM_KEY
    })

    this.logger.log('PayOS Service v2 initialized successfully')
  }

  /**
   * Tạo payment link từ PayOS (v2 API)
   */
  async createPaymentLink(
    requestData: PayOSCheckoutRequest
  ): Promise<PayOSCheckoutResponse> {
    try {
      this.logger.log(`Creating PayOS payment link for order ${requestData.orderCode}`)

      // API v2: paymentRequests.create()
      const response = await this.payOS.paymentRequests.create(requestData)

      this.logger.log(
        `PayOS payment link created successfully: ${response.paymentLinkId}`
      )

      return response as PayOSCheckoutResponse
    } catch (error) {
      this.logger.error('Failed to create PayOS payment link:', error)
      throw new ErrorUnknowWithPayOSSystemException()
    }
  }

  /**
   * Lấy thông tin payment từ PayOS (v2 API)
   */
  async getPaymentLinkInformation(orderCode: number): Promise<PayOSPaymentLinkInfo> {
    try {
      this.logger.log(`Getting PayOS payment info for order: ${orderCode}`)

      // API v2: paymentRequests.get() - chỉ nhận orderCode (number)
      const response = await this.payOS.paymentRequests.get(orderCode)

      return response as PayOSPaymentLinkInfo
    } catch (error) {
      this.logger.error('Failed to get PayOS payment info:', error)
      throw new ErrorUnknowWithPayOSSystemException()
    }
  }

  /**
   * Hủy payment link từ PayOS (v2 API)
   */
  async cancelPaymentLink(
    orderCode: number,
    cancellationReason?: string
  ): Promise<PayOSPaymentLinkInfo> {
    try {
      this.logger.log(
        `Cancelling PayOS payment: ${orderCode}, reason: ${cancellationReason}`
      )

      // API v2: paymentRequests.cancel() - chỉ nhận orderCode (number)
      const response = await this.payOS.paymentRequests.cancel(
        orderCode,
        cancellationReason
      )

      this.logger.log(`PayOS payment cancelled successfully`)

      return response as PayOSPaymentLinkInfo
    } catch (error) {
      this.logger.error('Failed to cancel PayOS payment:', error)
      throw new ErrorUnknowWithPayOSSystemException()
    }
  }

  /**
   * Xác thực webhook URL với PayOS (v2 API)
   */
  async confirmWebhook(webhookUrl: string): Promise<any> {
    try {
      this.logger.log(`Confirming PayOS webhook URL: ${webhookUrl}`)

      // API v2: webhooks.confirm()
      const response = await this.payOS.webhooks.confirm(webhookUrl)

      this.logger.log('PayOS webhook confirmed successfully')

      return response
    } catch (error) {
      this.logger.error('Failed to confirm PayOS webhook:', error)
      throw new ErrorUnknowWithPayOSSystemException()
    }
  }

  /**
   * Xác minh dữ liệu webhook từ PayOS (v2 API)
   */
  async verifyPaymentWebhookData(webhookBody: any): Promise<PayOSWebhookData> {
    try {
      this.logger.log('Verifying PayOS webhook data')

      // API v2: webhooks.verify() - trả về WebhookData không có .data wrapper
      const webhookData = await this.payOS.webhooks.verify(webhookBody)

      this.logger.log(`PayOS webhook verified for order: ${webhookData.orderCode}`)

      return webhookData as unknown as PayOSWebhookData
    } catch (error) {
      this.logger.error('Failed to verify PayOS webhook data:', error)
      throw new ErrorUnknowWithPayOSSystemException()
    }
  }

  /**
   * Tạo orderCode duy nhất (timestamp-based)
   */
  generateOrderCode(): number {
    return Number(String(Date.now()).slice(-9))
  }

  /**
   * Tạo return & cancel URLs cho PayOS
   */
  generatePaymentUrls(invoiceId: number): { returnUrl: string; cancelUrl: string } {
    //todo chỉnh lại url sau khi test xong
    // const baseUrl = envConfig.FE_URL || 'http://localhost:3000'
    const baseUrl = 'http://localhost:4000'
    console.log(`Base URL for PayOS payment URLs: ${baseUrl}`)
    console.log(`Base URL for PayOS payment URLs: ${baseUrl}/payos/return`)
    console.log(`Base URL for PayOS payment URLs: ${baseUrl}/payos/cancel`)

    return {
      returnUrl: `${baseUrl}/payos/return`,
      cancelUrl: `${baseUrl}/payos/cancel`
    }
    // return {
    //   returnUrl: `${baseUrl}/payment/return`,
    //   cancelUrl: `${baseUrl}/payment/cancel`
    // }
  }

  /**
   * Tạo items array cho PayOS từ invoice và plan
   */
  createPayOSItems({
    invoice,
    plan
  }: {
    invoice: InvoiceType
    plan: SubscriptionPlanType
  }): PayOSItemData[] {
    return [
      {
        name: `${plan.type === 'LIFETIME' ? 'Lifetime' : `Recurring`}`,
        quantity: 1,
        // Giá item phải khớp tổng invoice và là số nguyên VND
        price: Math.round(invoice.totalAmount)
      }
    ]
  }
}
