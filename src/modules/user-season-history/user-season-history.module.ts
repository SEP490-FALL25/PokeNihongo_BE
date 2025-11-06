import { Module } from '@nestjs/common'
import { UserSeasonHistoryController } from './user-season-history.controller'
import { UserSeasonHistoryRepo } from './user-season-history.repo'
import { UserSeasonHistoryService } from './user-season-history.service'

@Module({
  controllers: [UserSeasonHistoryController],
  providers: [UserSeasonHistoryService, UserSeasonHistoryRepo],
  exports: [UserSeasonHistoryService, UserSeasonHistoryRepo]
})
export class UserSeasonHistoryModule {}
