import { Injectable } from '@nestjs/common'
import { DashboardRepo } from './dashboard.repo'

@Injectable()
export class DashboardService {
  constructor(private dashboardRepo: DashboardRepo) {}

  /**
   * Thống kê các gói subscription
   */
  async getSubStats(lang: string = 'vi') {
    return this.dashboardRepo.getSubscriptionStats()
  }

  /**
   * Thống kê doanh thu theo tháng/năm
   */
  async getSubStatsRevenue(lang: string = 'vi', month?: number, year?: number) {
    return this.dashboardRepo.getRevenueStats(month, year)
  }
}
