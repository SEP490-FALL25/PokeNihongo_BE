import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { Controller, Get, Query } from '@nestjs/common'
import { DashboardService } from './dashboard.service'

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('subscription-stats')
  getSubStats(@I18nLang() lang: string) {
    return this.dashboardService.getSubStats(lang)
  }

  @Get('subscription-stats/revennue')
  getSubStatsRevenue(
    @I18nLang() lang: string,
    @Query('month') month?: string,
    @Query('year') year?: string
  ) {
    const monthNum = month ? parseInt(month, 10) : undefined
    const yearNum = year ? parseInt(year, 10) : undefined
    return this.dashboardService.getSubStatsRevenue(lang, monthNum, yearNum)
  }

  @Get('subscription-stats/yearly-revenue')
  getYearlyRevenue(@I18nLang() lang: string, @Query('year') year?: string) {
    const yearNum = year ? parseInt(year, 10) : undefined
    return this.dashboardService.getYearlyRevenue(lang, yearNum)
  }

  @Get('subscription-stats/register-recently')
  getListUserRegister(@I18nLang() lang: string, @Query() query: PaginationQueryDTO) {
    return this.dashboardService.getListUserRegister(query, lang)
  }
}
