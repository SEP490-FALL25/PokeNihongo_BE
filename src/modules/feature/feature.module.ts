import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { FeatureController } from './feature.controller'
import { FeatureRepo } from './feature.repo'
import { FeatureService } from './feature.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [FeatureController],
  providers: [FeatureService, FeatureRepo],
  exports: [FeatureService, FeatureRepo]
})
export class FeatureModule {}
