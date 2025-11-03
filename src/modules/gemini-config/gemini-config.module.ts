import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { GeminiConfigController } from './gemini-config.controller'
import { GeminiConfigRepo } from './gemini-config.repo'
import { GeminiConfigService } from './gemini-config.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [GeminiConfigController],
  providers: [GeminiConfigService, GeminiConfigRepo],
  exports: [GeminiConfigService, GeminiConfigRepo]
})
export class GeminiConfigModule {}

