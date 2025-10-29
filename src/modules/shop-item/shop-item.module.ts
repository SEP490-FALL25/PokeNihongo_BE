import { forwardRef, Module } from '@nestjs/common'
import { PokemonModule } from '../pokemon/pokemon.module'
import { ShopBannerModule } from '../shop-banner/shop-banner.module'
import { ShopRarityPriceModule } from '../shop-rarity-price/shop-rarity-price.module'
import { ShopItemController } from './shop-item.controller'
import { ShopItemRepo } from './shop-item.repo'
import { ShopItemService } from './shop-item.service'

@Module({
  imports: [forwardRef(() => ShopBannerModule), PokemonModule, ShopRarityPriceModule],
  controllers: [ShopItemController],
  providers: [ShopItemService, ShopItemRepo],
  exports: [ShopItemService, ShopItemRepo]
})
export class ShopItemModule {}
