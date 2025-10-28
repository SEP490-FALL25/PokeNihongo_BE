import { Module } from '@nestjs/common'
import { ShopRarityPriceController } from './shop-rarity-price.controller'
import { ShopRarityPriceRepo } from './shop-rarity-price.repo'
import { ShopRarityPriceService } from './shop-rarity-price.service'

@Module({
  controllers: [ShopRarityPriceController],
  providers: [ShopRarityPriceService, ShopRarityPriceRepo]
})
export class ShopRarityPriceModule {}
