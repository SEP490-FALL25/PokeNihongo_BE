import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { AchievementGroupController } from './achievement-group.controller'
import { AchievementGroupRepo } from './achievement-group.repo'
import { AchievementGroupService } from './achievement-group.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [AchievementGroupController],
  providers: [AchievementGroupService, AchievementGroupRepo],
  exports: [AchievementGroupService, AchievementGroupRepo]
})
export class AchievementGroupModule {}
