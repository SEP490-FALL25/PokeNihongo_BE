import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { InvoiceStatus, PrismaClient, UserSubscriptionStatus } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { USER_SEASON_HISTORY_FIELDS } from '../user-subscription/entities/user-subscription.entity'

@Injectable()
export class DashboardRepo {
  constructor(private prismaService: PrismaService) {}
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }

  /**
   * Lấy thống kê các gói subscription đang active
   */
  async getSubscriptionStats() {
    // Lấy danh sách các gói đang active
    const activePlans = await this.prismaService.subscriptionPlan.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        subscriptionId: true,
        durationInDays: true,
        price: true,
        type: true,
        subscription: {
          select: {
            id: true,
            nameKey: true,
            descriptionKey: true,
            tagName: true,
            nameTranslations: {
              select: {
                id: true,
                languageId: true,
                value: true,
                language: {
                  select: {
                    code: true
                  }
                }
              }
            },
            descriptionTranslations: {
              select: {
                id: true,
                languageId: true,
                value: true,
                language: {
                  select: {
                    code: true
                  }
                }
              }
            },
            features: {
              select: {
                id: true,
                value: true,
                feature: {
                  select: {
                    id: true,
                    nameKey: true,
                    featureKey: true,
                    nameTranslations: {
                      select: {
                        id: true,
                        languageId: true,
                        value: true,
                        language: {
                          select: {
                            code: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    // Lấy tổng số user trong hệ thống
    const totalUsers = await this.prismaService.user.count({
      where: {
        deletedAt: null
      }
    })

    // Lấy thống kê cho từng gói
    const stats = await Promise.all(
      activePlans.map(async (plan) => {
        const [totalPurchases, activeUsers] = await Promise.all([
          // Tổng lượt mua thành công (đếm invoice PAID)
          this.prismaService.invoice.count({
            where: {
              subscriptionPlanId: plan.id,
              deletedAt: null,
              status: InvoiceStatus.PAID
            }
          }),
          // Số người đang có gói (ACTIVE)
          this.prismaService.userSubscription.count({
            where: {
              subscriptionPlanId: plan.id,
              deletedAt: null,
              status: UserSubscriptionStatus.ACTIVE
            }
          })
        ])

        return {
          planId: plan.id,
          subscriptionId: plan.subscriptionId,
          subscription: plan.subscription,
          durationInDays: plan.durationInDays,
          price: plan.price,
          type: plan.type,
          stats: {
            totalPurchases,
            activeUsers,
            inactiveUsers: totalUsers - activeUsers
          }
        }
      })
    )

    return {
      totalActivePlans: activePlans.length,
      plans: stats
    }
  }

  /**
   * Lấy thống kê doanh thu theo tháng/năm
   */
  async getRevenueStats(month?: number, year?: number) {
    const currentYear = year || new Date().getFullYear()
    const currentMonth = month || new Date().getMonth() + 1

    // Lấy danh sách các gói đang active
    const activePlans = await this.prismaService.subscriptionPlan.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        subscriptionId: true,
        durationInDays: true,
        price: true,
        type: true,
        subscription: {
          select: {
            id: true,
            nameKey: true,
            descriptionKey: true,
            tagName: true
          }
        }
      }
    })

    // Tính doanh thu cho từng gói
    const revenueByPlan = await Promise.all(
      activePlans.map(async (plan) => {
        // Doanh thu tháng hiện tại
        const monthRevenue = await this.prismaService.invoice.aggregate({
          where: {
            subscriptionPlanId: plan.id,
            status: InvoiceStatus.PAID,
            deletedAt: null,
            createdAt: {
              gte: new Date(currentYear, currentMonth - 1, 1),
              lt: new Date(currentYear, currentMonth, 1)
            }
          },
          _sum: {
            totalAmount: true
          },
          _count: true
        })

        // Doanh thu năm hiện tại
        const yearRevenue = await this.prismaService.invoice.aggregate({
          where: {
            subscriptionPlanId: plan.id,
            status: InvoiceStatus.PAID,
            deletedAt: null,
            createdAt: {
              gte: new Date(currentYear, 0, 1),
              lt: new Date(currentYear + 1, 0, 1)
            }
          },
          _sum: {
            totalAmount: true
          },
          _count: true
        })

        return {
          planId: plan.id,
          subscriptionId: plan.subscriptionId,
          subscription: plan.subscription,
          durationInDays: plan.durationInDays,
          price: plan.price,
          type: plan.type,
          revenue: {
            month: {
              total: monthRevenue._sum?.totalAmount || 0,
              count: monthRevenue._count
            },
            year: {
              total: yearRevenue._sum?.totalAmount || 0,
              count: yearRevenue._count
            }
          }
        }
      })
    )

    // Tính tổng doanh thu
    const totalMonthRevenue = revenueByPlan.reduce(
      (sum, plan) => sum + (plan.revenue.month.total || 0),
      0
    )
    const totalYearRevenue = revenueByPlan.reduce(
      (sum, plan) => sum + (plan.revenue.year.total || 0),
      0
    )

    return {
      period: {
        month: currentMonth,
        year: currentYear
      },
      totalRevenue: {
        month: totalMonthRevenue,
        year: totalYearRevenue
      },
      plans: revenueByPlan
    }
  }

  // Lấy danh sách user đăng ký gần đây

  async getUsersSubWithSubPlan(pagination: PaginationQueryType, langId?: number) {
    const { where, orderBy } = parseQs(pagination.qs, USER_SEASON_HISTORY_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere: any = {
      deletedAt: null,
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userSubscription.count({ where: filterWhere }),
      this.prismaService.userSubscription.findMany({
        where: filterWhere,
        include: {
          // invoice: true,
          subscriptionPlan: {
            include: {
              subscription: {
                include: {
                  nameTranslations: { select: { value: true, languageId: true } },
                  descriptionTranslations: { select: { value: true, languageId: true } }
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc',
          ...orderBy
        },
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
}
