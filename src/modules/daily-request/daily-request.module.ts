import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { DailyRequestController } from './daily-request.controller'
import { DailyRequestRepo } from './daily-request.repo'
import { DailyRequestService } from './daily-request.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [DailyRequestController],
  providers: [DailyRequestService, DailyRequestRepo]
})
export class DailyRequestModule {}
