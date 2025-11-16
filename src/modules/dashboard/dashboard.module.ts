import { Module } from '@nestjs/common'
import { DashboardController } from './dashboard.controller'
import { DashboardRepo } from './dashboard.repo'
import { DashboardService } from './dashboard.service'

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepo]
})
export class DashboardModule {}
