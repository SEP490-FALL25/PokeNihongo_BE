import { LanguagesModule } from '@/modules/languages/languages.module'
import { TranslationModule } from '@/modules/translation/translation.module'
import { Module } from '@nestjs/common'
import { GachaBannerController } from './gacha-banner.controller'
import { GachaBannerRepo } from './gacha-banner.repo'
import { GachaBannerService } from './gacha-banner.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [GachaBannerController],
  providers: [GachaBannerService, GachaBannerRepo],
  exports: [GachaBannerService, GachaBannerRepo]
})
export class GachaBannerModule {}
