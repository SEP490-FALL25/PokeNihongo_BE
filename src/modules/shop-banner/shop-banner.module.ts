import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { ShopBannerController } from './shop-banner.controller'
import { ShopBannerRepo } from './shop-banner.repo'
import { ShopBannerService } from './shop-banner.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [ShopBannerController],
  providers: [ShopBannerService, ShopBannerRepo],
  exports: [ShopBannerService, ShopBannerRepo]
})
export class ShopBannerModule {}
