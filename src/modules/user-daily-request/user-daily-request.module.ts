import { Module } from '@nestjs/common'
import { DailyRequestModule } from '../daily-request/daily-request.module'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { UserModule } from '../user/user.module'
import { UserDailyRequestController } from './user-daily-request.controller'
import { UserDailyRequestRepo } from './user-daily-request.repo'
import { UserDailyRequestService } from './user-daily-request.service'

@Module({
  imports: [DailyRequestModule, LanguagesModule, TranslationModule, UserModule],
  controllers: [UserDailyRequestController],
  providers: [UserDailyRequestService, UserDailyRequestRepo],
  exports: [UserDailyRequestService, UserDailyRequestRepo]
})
export class UserDailyRequestModule {}
