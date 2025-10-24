import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { AttendenceConfigController } from './attendence-config.controller'
import { AttendenceConfigRepo } from './attendence-config.repo'
import { AttendenceConfigService } from './attendence-config.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [AttendenceConfigController],
  providers: [AttendenceConfigService, AttendenceConfigRepo],
  exports: [AttendenceConfigService, AttendenceConfigRepo]
})
export class AttendenceConfigModule {}
