import { Module } from '@nestjs/common'
import { AchievementGroupModule } from '../achievement-group/achievement-group.module'
import { AchievementModule } from '../achievement/achievement.module'
import { LanguagesModule } from '../languages/languages.module'
import { UserAchievementController } from './user-achievement.controller'
import { UserAchievementRepo } from './user-achievement.repo'
import { UserAchievementService } from './user-achievement.service'

@Module({
  imports: [AchievementGroupModule, AchievementModule, LanguagesModule],
  controllers: [UserAchievementController],
  providers: [UserAchievementService, UserAchievementRepo]
})
export class UserAchievementModule {}
