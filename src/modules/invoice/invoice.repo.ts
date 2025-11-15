import { InvoiceStatusType } from '@/common/constants/invoice.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateInvoiceBodyType,
  InvoiceType,
  USER_SEASON_HISTORY_FIELDS,
  UpdateInvoiceBodyType
} from './entities/invoice.entity'

@Injectable()
export class InvoiceRepo {
  constructor(private prismaService: PrismaService) {}
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }
  create(
    {
      createdById,
      data
    }: {
      createdById: number
      data: CreateInvoiceBodyType & {
        userId: number
        subtotalAmount: number
        discountAmount: number
        totalAmount: number
      }
    },
    prismaTx?: PrismaClient
  ): Promise<InvoiceType> {
    const client = prismaTx || this.prismaService
    return client.invoice.create({
      data: {
        ...data,
        userId: data.userId || createdById
      }
    })
  }

  update(
    {
      id,
      data,
      updatedById
    }: {
      id: number
      data: UpdateInvoiceBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<InvoiceType> {
    const client = prismaTx || this.prismaService
    return client.invoice.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data
      }
    })
  }

  updateWalletTransaction(
    id: number,
    walletTransactionId: number,
    prismaTx?: PrismaClient
  ): Promise<InvoiceType> {
    const client = prismaTx || this.prismaService
    return client.invoice.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        walletTransactionId
      }
    })
  }

  delete(id: number, isHard?: boolean, prismaTx?: PrismaClient): Promise<InvoiceType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.invoice.delete({
          where: { id }
        })
      : client.invoice.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async list(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.invoice.count({
        where: filterWhere
      }),
      this.prismaService.invoice.findMany({
        where: filterWhere,

        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findById(id: number): Promise<InvoiceType | null> {
    return this.prismaService.invoice.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findActiveByUserIdPlanIdAndStatus(
    userId: number,
    planId: number,
    status: InvoiceStatusType
  ): Promise<InvoiceType | null> {
    return this.prismaService.invoice.findFirst({
      where: {
        userId,
        subscriptionPlanId: planId,
        status,
        deletedAt: null
      }
    })
  }
}
