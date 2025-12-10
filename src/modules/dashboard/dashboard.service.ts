import { RoleName } from '@/common/constants/role.constant'
import { convertEloToRank } from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { LanguagesRepository } from '../languages/languages.repo'
import { DashboardRepo } from './dashboard.repo'

@Injectable()
export class DashboardService {
  constructor(
    private dashboardRepo: DashboardRepo,
    private readonly langRepo: LanguagesRepository,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Thống kê các gói subscription
   */
  async getSubStats(lang: string = 'vi') {
    const result = await this.dashboardRepo.getSubscriptionStats()

    // Format lại plans với nameTranslation và descriptionTranslation theo lang
    const formattedPlans = result.plans.map((plan) => {
      const { subscription } = plan

      // Tìm translation theo lang code
      const nameTranslation =
        subscription.nameTranslations.find((t) => t.language.code === lang)?.value || ''
      const descriptionTranslation =
        subscription.descriptionTranslations.find((t) => t.language.code === lang)
          ?.value || ''

      // Format nameTranslations theo thứ tự en, ja, vi
      const sortedNameTranslations = ['en', 'ja', 'vi']
        .map((code) => {
          const trans = subscription.nameTranslations.find(
            (t) => t.language.code === code
          )
          return trans ? { key: trans.language.code, value: trans.value } : null
        })
        .filter((t) => t !== null)

      // Format descriptionTranslations theo thứ tự en, ja, vi
      const sortedDescriptionTranslations = ['en', 'ja', 'vi']
        .map((code) => {
          const trans = subscription.descriptionTranslations.find(
            (t) => t.language.code === code
          )
          return trans ? { key: trans.language.code, value: trans.value } : null
        })
        .filter((t) => t !== null)

      // Format features với nameTranslation
      const formattedFeatures = subscription.features.map((sf) => {
        const sortedFeatureNameTranslations = ['en', 'ja', 'vi']
          .map((code) => {
            const trans = sf.feature.nameTranslations.find(
              (t) => t.language.code === code
            )
            return trans ? { key: trans.language.code, value: trans.value } : null
          })
          .filter((t) => t !== null)

        return {
          id: sf.id,
          value: sf.value,
          feature: {
            id: sf.feature.id,
            nameKey: sf.feature.nameKey,
            featureKey: sf.feature.featureKey,
            nameTranslation:
              sf.feature.nameTranslations.find((t) => t.language.code === lang)?.value ||
              '',
            nameTranslations: sortedFeatureNameTranslations
          }
        }
      })

      return {
        planId: plan.planId,
        subscriptionId: plan.subscriptionId,
        subscription: {
          id: subscription.id,
          nameKey: subscription.nameKey,
          descriptionKey: subscription.descriptionKey,
          tagName: subscription.tagName,
          nameTranslation,
          nameTranslations: sortedNameTranslations,
          descriptionTranslation,
          descriptionTranslations: sortedDescriptionTranslations,
          features: formattedFeatures
        },
        durationInDays: plan.durationInDays,
        price: plan.price,
        type: plan.type,
        stats: plan.stats
      }
    })

    return {
      totalActivePlans: result.totalActivePlans,
      plans: formattedPlans
    }
  }

  /**
   * Thống kê doanh thu theo tháng/năm
   */
  async getSubStatsRevenue(lang: string = 'vi', month?: number, year?: number) {
    return this.dashboardRepo.getRevenueStats(month, year)
  }

  /**
   * Thống kê doanh thu 12 tháng của năm
   */
  async getYearlyRevenue(lang: string = 'vi', year?: number) {
    return this.dashboardRepo.getYearlyRevenueBreakdown(lang, year)
  }

  async getListUserRegister(query: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.langRepo.getIdByCode(lang)
    if (!langId) {
      return this.dashboardRepo.getUsersSubWithSubPlan(query)
    }
    return this.dashboardRepo.getUsersSubWithSubPlan(query, langId)
  }

  /**
   * Tổng số người dùng (role = learner)
   */
  async getTotalUsers() {
    return this.dashboardRepo.getTotalUsers()
  }

  /**
   * Số lượng người dùng mới theo period (day/week/month)
   */
  async getNewUsers(period: string = 'month') {
    return this.dashboardRepo.getNewUsers(period)
  }

  /**
   * Người dùng hoạt động theo period (day/week/month) - dựa vào lastActive
   */
  async getActiveUsers(period: string = 'month') {
    return this.dashboardRepo.getActiveUsers(period)
  }

  /**
   * Kích hoạt account: pending_test, pending_choose_level_jlpt, pending_choose_pokemon
   */
  async getAccountActivation() {
    return this.dashboardRepo.getAccountActivation()
  }

  /**
   * Phân bổ trình độ JLPT: N3, N4, N5 với total và percent
   */
  async getJLPTDistribution() {
    return this.dashboardRepo.getJLPTDistribution()
  }

  /**
   * Tỷ lệ Duy trì Streak - xem qua attendance
   */
  async getStreakRetention() {
    return this.dashboardRepo.getStreakRetention()
  }

  /**
   * Phân phối Pokémon Khởi đầu
   */
  async getStarterPokemonDistribution() {
    return this.dashboardRepo.getStarterPokemonDistribution()
  }

  /**
   * Hoạt động Battle - trả ra các mùa với thống kê user theo JLPT
   */
  async getBattleActivity(lang: string = 'vi') {
    return this.dashboardRepo.getBattleActivity(lang)
  }

  /**
   * Mức độ tích lũy sparkles của user
   */
  async getSparklesAccumulation() {
    return this.dashboardRepo.getSparklesAccumulation()
  }

  /**
   * Nội dung Phổ biến nhất - phần học nào được học nhiều nhất
   */
  async getPopularContent(lang: string = 'vi') {
    return this.dashboardRepo.getPopularContent(lang)
  }

  /**
   * Tỷ lệ Hoàn thành Bài học (Completion Rate)
   */
  async getLessonCompletionRate(lang: string = 'vi') {
    return this.dashboardRepo.getLessonCompletionRate(lang)
  }

  /**
   * Leaderboard Stats - Tổng quan (Danh sách mùa ACTIVE + EXPIRED với pagination)
   */
  async getLeaderboardSeasonStats(
    lang: string = 'vi',
    page: number = 1,
    pageSize: number = 10
  ) {
    const skip = (page - 1) * pageSize

    // Lấy danh sách mùa ACTIVE + EXPIRED
    const seasons = await this.prisma.leaderboardSeason.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXPIRED'] },
        deletedAt: null
      },
      include: {
        nameTranslations: {
          include: { language: { select: { code: true } } }
        },
        userHistories: {
          where: {
            user: {
              role: { name: RoleName.Learner },
              deletedAt: null
            }
          },
          select: {
            id: true,
            userId: true,
            finalElo: true,
            finalRank: true,
            user: { select: { eloscore: true } }
          }
        },
        matches: {
          select: { id: true, status: true }
        }
      },
      orderBy: { startDate: 'desc' },
      skip,
      take: pageSize
    })

    // Tính tổng số mùa (cho pagination)
    const totalCount = await this.prisma.leaderboardSeason.count({
      where: {
        status: { in: ['ACTIVE', 'EXPIRED'] },
        deletedAt: null
      }
    })

    // Tính tổng user Learner trong hệ thống
    const totalUsers = await this.prisma.user.count({
      where: {
        role: { name: RoleName.Learner },
        deletedAt: null
      }
    })

    // Format lại data cho mỗi mùa
    const formattedSeasons = seasons.map((season) => {
      // Format nameTranslations
      const nameTranslations = ['en', 'ja', 'vi']
        .map((code) => {
          const trans = season.nameTranslations.find((t) => t.language.code === code)
          return trans ? { key: code, value: trans.value } : null
        })
        .filter((t) => t !== null)

      // Lấy nameTranslation theo lang của user
      const nameTranslation =
        season.nameTranslations.find((t) => t.language.code === lang)?.value || ''

      // Số user tham gia mùa này
      const participantCount = season.userHistories.length
      const nonParticipantCount = totalUsers - participantCount

      // Tính rank distribution
      const rankDistribution = this.calculateRankDistribution(
        season.userHistories,
        season.status
      )

      // Tổng số trận trong mùa
      const totalMatches = season.matches.length
      const totalMatchesSuccess = season.matches.filter((m) => m.status === 'COMPLETED').length

      return {
        id: season.id,
        nameKey: season.nameKey,
        nameTranslation,
        nameTranslations,
        status: season.status,
        startDate: season.startDate,
        endDate: season.endDate,
        totalParticipants: participantCount,
        totalNonParticipants: nonParticipantCount,
        totalMatches,
        totalMatchesSuccess,
        rankDistribution
      }
    })

    return {
      data: formattedSeasons,
      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize)
      }
    }
  }

  /**
   * Leaderboard Stats - Chi tiết 1 mùa
   */
  async getLeaderboardSeasonDetail(seasonId: number, lang: string = 'vi') {
    const season = await this.prisma.leaderboardSeason.findUnique({
      where: { id: seasonId, deletedAt: null },
      include: {
        nameTranslations: {
          include: { language: { select: { code: true } } }
        },
        userHistories: {
          where: {
            user: {
              role: { name: RoleName.Learner },
              deletedAt: null
            }
          },
          select: {
            id: true,
            userId: true,
            finalElo: true,
            finalRank: true,
            user: { select: { eloscore: true } }
          }
        },
        matches: {
          select: { id: true, status: true }
        }
      }
    })

    if (!season) {
      return {
        success: false,
        message: 'Season not found'
      }
    }

    // Format nameTranslations
    const nameTranslations = ['en', 'ja', 'vi']
      .map((code) => {
        const trans = season.nameTranslations.find((t) => t.language.code === code)
        return trans ? { key: code, value: trans.value } : null
      })
      .filter((t) => t !== null)

    // Lấy nameTranslation theo lang của user
    const nameTranslation =
      season.nameTranslations.find((t) => t.language.code === lang)?.value || ''

    // Tính tổng user Learner trong hệ thống
    const totalUsers = await this.prisma.user.count({
      where: {
        role: { name: RoleName.Learner },
        deletedAt: null
      }
    })

    // Số user tham gia mùa này
    const participantCount = season.userHistories.length
    const nonParticipantCount = totalUsers - participantCount

    // Tính rank distribution
    const rankDistribution = this.calculateRankDistribution(
      season.userHistories,
      season.status
    )

    // Tổng số trận trong mùa
    const totalMatches = season.matches.length
    const totalMatchesSuccess = season.matches.filter((m) => m.status === 'COMPLETED').length

    return {
      success: true,
      data: {
        id: season.id,
        nameKey: season.nameKey,
        nameTranslation,
        nameTranslations,
        status: season.status,
        startDate: season.startDate,
        endDate: season.endDate,
        totalParticipants: participantCount,
        totalNonParticipants: nonParticipantCount,
        totalMatches,
        totalMatchesSuccess,
        rankDistribution
      }
    }
  }

  /**
   * Helper: Tính rank distribution dựa trên trạng thái mùa
   * - EXPIRED: dùng finalRank từ UserSeasonHistory
   * - ACTIVE: dùng eloscore hiện tại và convertEloToRank
   */
  private calculateRankDistribution(userHistories: any[], status: string) {
    const rankCounts = { N3: 0, N4: 0, N5: 0 }

    for (const uh of userHistories) {
      let rank: string

      if (status === 'EXPIRED') {
        // Dùng finalRank từ UserSeasonHistory
        rank = uh.finalRank || 'N5'
      } else {
        // ACTIVE: dùng eloscore hiện tại
        const currentElo = uh.user?.eloscore || 0
        rank = convertEloToRank(currentElo)
      }

      if (rank in rankCounts) {
        rankCounts[rank]++
      }
    }

    const totalParticipants = userHistories.length || 1 // Tránh chia cho 0

    return ['N3', 'N4', 'N5'].map((rankName) => ({
      rankName,
      count: rankCounts[rankName],
      percentage: parseFloat(
        ((rankCounts[rankName] / totalParticipants) * 100).toFixed(2)
      )
    }))
  }
}
