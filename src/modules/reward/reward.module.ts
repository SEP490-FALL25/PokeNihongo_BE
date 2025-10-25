import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { RewardController } from './reward.controller'
import { RewardRepo } from './reward.repo'
import { RewardService } from './reward.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [RewardController],
  providers: [RewardService, RewardRepo]
})
export class RewardModule { }
