import { forwardRef, Module } from '@nestjs/common'
import { ShopBannerModule } from '../shop-banner/shop-banner.module'
import { ShopItemModule } from '../shop-item/shop-item.module'
import { ShopRarityPriceController } from './shop-rarity-price.controller'
import { ShopRarityPriceRepo } from './shop-rarity-price.repo'
import { ShopRarityPriceService } from './shop-rarity-price.service'

@Module({
  imports: [forwardRef(() => ShopBannerModule), forwardRef(() => ShopItemModule)],
  controllers: [ShopRarityPriceController],
  providers: [ShopRarityPriceService, ShopRarityPriceRepo],
  exports: [ShopRarityPriceRepo]
})
export class ShopRarityPriceModule {}
