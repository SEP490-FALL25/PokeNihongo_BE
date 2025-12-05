import { RoleName } from '@/common/constants/role.constant'
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

  /**
   * Lấy thống kê doanh thu 12 tháng của năm
   * Mỗi tháng có: doanh thu các gói, số người đăng ký, tăng giảm so với tháng trước
   */
  async getYearlyRevenueBreakdown(lang: string = 'vi', year?: number) {
    const targetYear = year || new Date().getFullYear()

    // Lấy danh sách các gói đang active
    const activePlans = await this.prismaService.subscriptionPlan.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        subscriptionId: true,
        price: true,
        type: true,
        subscription: {
          select: {
            id: true,
            nameKey: true,
            tagName: true,
            nameTranslations: {
              select: {
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
    })

    // Tạo array 12 tháng
    const monthlyData = await Promise.all(
      Array.from({ length: 12 }, async (_, index) => {
        const month = index + 1
        const startDate = new Date(targetYear, month - 1, 1)
        const endDate = new Date(targetYear, month, 1)

        // Tính doanh thu và số lượt mua cho từng gói trong tháng
        const planStats = await Promise.all(
          activePlans.map(async (plan) => {
            const invoiceData = await this.prismaService.invoice.aggregate({
              where: {
                subscriptionPlanId: plan.id,
                status: InvoiceStatus.PAID,
                deletedAt: null,
                createdAt: {
                  gte: startDate,
                  lt: endDate
                }
              },
              _sum: {
                totalAmount: true
              },
              _count: true
            })

            // Đếm số người đăng ký mới trong tháng (theo startDate của UserSubscription)
            const newSubscribers = await this.prismaService.userSubscription.count({
              where: {
                subscriptionPlanId: plan.id,
                deletedAt: null,
                startDate: {
                  gte: startDate,
                  lt: endDate
                }
              }
            })

            // Tìm translation theo lang code
            const nameTranslation =
              plan.subscription.nameTranslations.find((t) => t.language.code === lang)
                ?.value || plan.subscription.nameKey

            return {
              planId: plan.id,
              nameTranslation,
              tagName: plan.subscription.tagName,
              revenue: invoiceData._sum?.totalAmount || 0,
              purchases: invoiceData._count,
              newSubscribers
            }
          })
        )

        // Tổng doanh thu tháng
        const totalRevenue = planStats.reduce((sum, p) => sum + p.revenue, 0)
        const totalPurchases = planStats.reduce((sum, p) => sum + p.purchases, 0)
        const totalNewSubscribers = planStats.reduce(
          (sum, p) => sum + p.newSubscribers,
          0
        )

        return {
          month,
          year: targetYear,
          totalRevenue,
          totalPurchases,
          totalNewSubscribers,
          plans: planStats
        }
      })
    )

    // Tính tăng giảm so với tháng trước cho mỗi tháng
    const monthlyDataWithGrowth = monthlyData.map((currentMonth, index) => {
      if (index === 0) {
        // Tháng 1 không có tháng trước để so sánh
        return {
          ...currentMonth,
          growth: {
            revenue: { amount: 0, percentage: 0, trend: 'stable' as const },
            purchases: { amount: 0, percentage: 0, trend: 'stable' as const },
            newSubscribers: { amount: 0, percentage: 0, trend: 'stable' as const }
          }
        }
      }

      const previousMonth = monthlyData[index - 1]

      // Tính tăng giảm doanh thu
      const revenueDiff = currentMonth.totalRevenue - previousMonth.totalRevenue
      const revenuePercentage =
        previousMonth.totalRevenue > 0
          ? (revenueDiff / previousMonth.totalRevenue) * 100
          : currentMonth.totalRevenue > 0
            ? 100
            : 0

      // Tính tăng giảm số lượt mua
      const purchasesDiff = currentMonth.totalPurchases - previousMonth.totalPurchases
      const purchasesPercentage =
        previousMonth.totalPurchases > 0
          ? (purchasesDiff / previousMonth.totalPurchases) * 100
          : currentMonth.totalPurchases > 0
            ? 100
            : 0

      // Tính tăng giảm số người đăng ký mới
      const subscribersDiff =
        currentMonth.totalNewSubscribers - previousMonth.totalNewSubscribers
      const subscribersPercentage =
        previousMonth.totalNewSubscribers > 0
          ? (subscribersDiff / previousMonth.totalNewSubscribers) * 100
          : currentMonth.totalNewSubscribers > 0
            ? 100
            : 0

      return {
        ...currentMonth,
        growth: {
          revenue: {
            amount: revenueDiff,
            percentage: Math.round(revenuePercentage * 100) / 100,
            trend:
              revenuePercentage > 0
                ? ('up' as const)
                : revenuePercentage < 0
                  ? ('down' as const)
                  : ('stable' as const)
          },
          purchases: {
            amount: purchasesDiff,
            percentage: Math.round(purchasesPercentage * 100) / 100,
            trend:
              purchasesPercentage > 0
                ? ('up' as const)
                : purchasesPercentage < 0
                  ? ('down' as const)
                  : ('stable' as const)
          },
          newSubscribers: {
            amount: subscribersDiff,
            percentage: Math.round(subscribersPercentage * 100) / 100,
            trend:
              subscribersPercentage > 0
                ? ('up' as const)
                : subscribersPercentage < 0
                  ? ('down' as const)
                  : ('stable' as const)
          }
        }
      }
    })

    // Tổng hợp cả năm
    const yearTotal = {
      revenue: monthlyData.reduce((sum, m) => sum + m.totalRevenue, 0),
      purchases: monthlyData.reduce((sum, m) => sum + m.totalPurchases, 0),
      newSubscribers: monthlyData.reduce((sum, m) => sum + m.totalNewSubscribers, 0)
    }

    return {
      year: targetYear,
      yearTotal,
      months: monthlyDataWithGrowth
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

  /**
   * Tổng số người dùng có role = learner
   */
  async getTotalUsers() {
    const total = await this.prismaService.user.count({
      where: {
        deletedAt: null,
        role: {
          name: RoleName.Learner
        }
      }
    })

    return { total }
  }

  /**
   * Số lượng người dùng mới theo period (day/week/month)
   */
  async getNewUsers(period: string = 'month') {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        startDate = weekStart
        break
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    const count = await this.prismaService.user.count({
      where: {
        deletedAt: null,
        role: {
          name: RoleName.Learner
        },
        createdAt: {
          gte: startDate,
          lte: now
        }
      }
    })

    return { count, period }
  }

  /**
   * Người dùng hoạt động theo period - dựa vào Device.lastActive
   */
  async getActiveUsers(period: string = 'month') {
    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        startDate = weekStart
        break
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
    }

    // Count distinct users with devices that have lastActive in the period
    const activeUsers = await this.prismaService.user.count({
      where: {
        deletedAt: null,
        role: {
          name: RoleName.Learner
        },
        devices: {
          some: {
            lastActive: {
              gte: startDate,
              lte: now
            }
          }
        }
      }
    })

    return { activeUsers, period }
  }

  /**
   * Kích hoạt account: pending_test, test_again, pending_choose_level_jlpt, pending_choose_pokemon
   * - pending_test: Count distinct users with any PLACEMENT_TEST_DONE status != COMPLETED
   * - test_again: Count distinct users with PLACEMENT_TEST_DONE status = COMPLETED
   * - pending_choose_level_jlpt: User có levelJLPT = null
   * - pending_choose_pokemon: User chưa có UserPokemon nào
   */
  async getAccountActivation() {
    // Get total learner users
    const totalUsers = await this.prismaService.user.count({
      where: {
        deletedAt: null,
        role: { name: RoleName.Learner }
      }
    })

    // Get distinct users with PLACEMENT_TEST status != COMPLETED
    const pendingTestUsers = await this.prismaService.userTestAttempt.findMany({
      where: {
        status: { not: 'COMPLETED' },
        test: {
          testType: 'PLACEMENT_TEST_DONE'
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    })

    // Get distinct users with PLACEMENT_TEST status = COMPLETED
    const testAgainUsers = await this.prismaService.userTestAttempt.findMany({
      where: {
        status: 'COMPLETED',
        test: {
          testType: 'PLACEMENT_TEST_DONE'
        }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    })

    const [pendingChooseLevelJLPT, pendingChoosePokemon] = await Promise.all([
      // Count users with levelJLPT = null
      this.prismaService.user.count({
        where: {
          deletedAt: null,
          role: { name: RoleName.Learner },
          levelJLPT: null
        }
      }),
      // Count users without any UserPokemon
      this.prismaService.user.count({
        where: {
          deletedAt: null,
          role: { name: RoleName.Learner },
          levelId: null
        }
      })
    ])

    const pendingTest = pendingTestUsers.length
    const testAgain = testAgainUsers.length

    // Calculate percentages (avoid division by zero)
    const calculatePercent = (count: number, total: number): number => {
      return total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0
    }

    return {
      summary: {
        total: totalUsers
      },
      pending_test: {
        count: pendingTest,
        percent: calculatePercent(pendingTest, totalUsers)
      },
      test_again: {
        count: testAgain,
        percent: calculatePercent(testAgain, totalUsers)
      },
      pending_choose_level_jlpt: {
        count: pendingChooseLevelJLPT,
        percent: calculatePercent(pendingChooseLevelJLPT, totalUsers)
      },
      pending_choose_pokemon: {
        count: pendingChoosePokemon,
        percent: calculatePercent(pendingChoosePokemon, totalUsers)
      }
    }
  }

  /**
   * Phân bổ trình độ JLPT: N3, N4, N5
   */
  async getJLPTDistribution() {
    const distribution = await this.prismaService.user.groupBy({
      by: ['levelJLPT'],
      where: {
        deletedAt: null,
        role: { name: RoleName.Learner },
        levelJLPT: {
          in: [3, 4, 5]
        }
      },
      _count: true
    })

    const total = await this.prismaService.user.count({
      where: {
        deletedAt: null,
        role: { name: RoleName.Learner },
        levelJLPT: {
          in: [3, 4, 5]
        }
      }
    })

    const result = {
      N3: { total: 0, percent: 0 },
      N4: { total: 0, percent: 0 },
      N5: { total: 0, percent: 0 }
    }

    for (const item of distribution) {
      const levelKey = `N${item.levelJLPT}`
      if (result[levelKey]) {
        result[levelKey].total = item._count
        result[levelKey].percent =
          total > 0 ? ((item._count / total) * 100).toFixed(2) : 0
      }
    }

    return {
      summary: result,
      totalUsers: total
    }
  }
}
