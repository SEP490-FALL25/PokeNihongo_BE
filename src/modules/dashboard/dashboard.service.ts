import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { LanguagesRepository } from '../languages/languages.repo'
import { DashboardRepo } from './dashboard.repo'

@Injectable()
export class DashboardService {
  constructor(
    private dashboardRepo: DashboardRepo,
    private readonly langRepo: LanguagesRepository
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
}
