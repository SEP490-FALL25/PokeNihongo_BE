import { InvoiceStatus } from '@/common/constants/invoice.constant'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { CreatePaymentType, PaymentType } from './entities/payment.model'

@Injectable()
export class PaymentRepo {
  constructor(private prisma: PrismaService) {}
  // Payment CRUD operations
  async createPayment(data: CreatePaymentType): Promise<PaymentType> {
    return this.prisma.payment.create({
      data
    })
  }

  async findPaymentByPayOSOrderId(payosOrderId: string): Promise<PaymentType | null> {
    return this.prisma.payment.findFirst({
      where: {
        payosOrderId,
        deletedAt: null
      }
    })
  }

  async updatePayment(id: number, data: Prisma.PaymentUpdateInput): Promise<PaymentType> {
    return this.prisma.payment.update({
      where: { id },
      data
    })
  }

  async findLatestPendingByInvoice(invoiceId: number): Promise<PaymentType | null> {
    return this.prisma.payment.findFirst({
      where: {
        invoiceId,
        status: 'PENDING',
        deletedAt: null
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async markInvoicePaid(paymentId: number, invoiceId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'PAID',
          paidAt: new Date()
        }
      })
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.PAID
        }
      })
    })
  }
}
