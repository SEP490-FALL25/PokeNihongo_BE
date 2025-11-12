import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { AchievementController } from './achievement.controller'
import { AchievementRepo } from './achievement.repo'
import { AchievementService } from './achievement.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [AchievementController],
  providers: [AchievementService, AchievementRepo],
  exports: [AchievementService, AchievementRepo]
})
export class AchievementModule {}
