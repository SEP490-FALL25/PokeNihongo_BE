import {
  FeatureKeyType,
  UserSubscriptionStatusType
} from '@/common/constants/subscription.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateUserSubscriptionBodyType,
  USER_SEASON_HISTORY_FIELDS,
  UpdateUserSubscriptionBodyType,
  UserSubscriptionType
} from './entities/user-subscription.entity'

@Injectable()
export class UserSubscriptionRepo {
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
      data: CreateUserSubscriptionBodyType & { userId: number }
    },
    prismaTx?: PrismaClient
  ): Promise<UserSubscriptionType> {
    const client = prismaTx || this.prismaService
    return client.userSubscription.create({
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
      data: UpdateUserSubscriptionBodyType
      updatedById?: number
    },
    prismaTx?: PrismaClient
  ): Promise<UserSubscriptionType> {
    const client = prismaTx || this.prismaService
    return client.userSubscription.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data
      }
    })
  }

  delete(
    id: number,
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<UserSubscriptionType> {
    const client = prismaTx || this.prismaService
    return isHard
      ? client.userSubscription.delete({
          where: { id }
        })
      : client.userSubscription.update({
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
      this.prismaService.userSubscription.count({
        where: filterWhere
      }),
      this.prismaService.userSubscription.findMany({
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

  async getUserSubWithSubPlan(
    pagination: PaginationQueryType,
    userId: number,
    langId?: number
  ) {
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere: any = {
      deletedAt: null,
      userId,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userSubscription.count({ where: filterWhere }),
      this.prismaService.userSubscription.findMany({
        where: filterWhere,
        include: {
          invoice: true,
          subscriptionPlan: {
            include: {
              subscription: {
                include: {
                  nameTranslations: { select: { value: true, languageId: true } },
                  descriptionTranslations: { select: { value: true, languageId: true } }
                }
              }
            }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    const results = data.map((us: any) => {
      const plan = us.subscriptionPlan
      if (!plan || !plan.subscription) return us
      const sub = plan.subscription
      const { nameTranslations, descriptionTranslations, ...subRest } = sub

      const nameTranslation = langId
        ? (nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
          sub.nameKey)
        : sub.nameKey
      const descriptionTranslation = langId
        ? (descriptionTranslations?.find((t: any) => t.languageId === langId)?.value ??
          sub.descriptionKey)
        : sub.descriptionKey

      return {
        ...us,
        subscriptionPlan: {
          ...plan,
          subscription: {
            ...subRest,
            nameTranslations,
            descriptionTranslations,
            nameTranslation,
            descriptionTranslation
          }
        }
      }
    })

    return {
      results,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findById(id: number): Promise<UserSubscriptionType | null> {
    return this.prismaService.userSubscription.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }

  findActiveByUserIdPlanIdAndStatus(
    userId: number,
    planId: number,
    status: UserSubscriptionStatusType
  ): Promise<UserSubscriptionType | null> {
    return this.prismaService.userSubscription.findFirst({
      where: {
        userId,
        subscriptionPlanId: planId,
        status,
        deletedAt: null
      }
    })
  }

  findByInvoiceId(invoiceId: number): Promise<UserSubscriptionType | null> {
    return this.prismaService.userSubscription.findFirst({
      where: {
        invoiceId,
        deletedAt: null
      }
    })
  }

  async findActiveByUserIdWithfeatureKey(userId: number, featureKey: FeatureKeyType) {
    return this.prismaService.userSubscription.findMany({
      where: {
        deletedAt: null,
        userId,
        status: 'ACTIVE'
      },
      include: {
        subscriptionPlan: {
          include: {
            subscription: {
              include: {
                features: {
                  where: {
                    feature: {
                      featureKey
                    }
                  },
                  include: {
                    feature: true
                  }
                }
              }
            }
          }
        }
      }
    })
  }
}
