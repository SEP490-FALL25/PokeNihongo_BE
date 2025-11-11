import { Module } from '@nestjs/common'
import { UserAchievementController } from './user-achievement.controller'
import { UserAchievementRepo } from './user-achievement.repo'
import { UserAchievementService } from './user-achievement.service'

@Module({
  controllers: [UserAchievementController],
  providers: [UserAchievementService, UserAchievementRepo]
})
export class UserAchievementModule {}
