import { Module } from '@nestjs/common'
import { AttendenceConfigModule } from '../attendence-config/attendence-config.module'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { UserDailyRequestModule } from '../user-daily-request/user-daily-request.module'
import { AttendanceController } from './attendance.controller'
import { AttendanceService } from './attendance.service'
import { AttendanceRepo } from './attendence.repo'

@Module({
  imports: [
    AttendenceConfigModule,
    LanguagesModule,
    TranslationModule,
    UserDailyRequestModule
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, AttendanceRepo]
})
export class AttendanceModule {}
