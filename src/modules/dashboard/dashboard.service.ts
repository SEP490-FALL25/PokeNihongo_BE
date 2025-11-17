import { Injectable } from '@nestjs/common'
import { DashboardRepo } from './dashboard.repo'

@Injectable()
export class DashboardService {
  constructor(private dashboardRepo: DashboardRepo) {}

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
        subscription.descriptionTranslations.find((t) => t.language.code === lang)?.value ||
        ''

      // Format nameTranslations theo thứ tự en, ja, vi
      const sortedNameTranslations = ['en', 'ja', 'vi']
        .map((code) => {
          const trans = subscription.nameTranslations.find((t) => t.language.code === code)
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
            const trans = sf.feature.nameTranslations.find((t) => t.language.code === code)
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
              sf.feature.nameTranslations.find((t) => t.language.code === lang)?.value || '',
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
}
