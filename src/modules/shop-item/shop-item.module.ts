import { forwardRef, Module } from '@nestjs/common'
import { PokemonModule } from '../pokemon/pokemon.module'
import { ShopBannerModule } from '../shop-banner/shop-banner.module'
import { ShopItemController } from './shop-item.controller'
import { ShopItemRepo } from './shop-item.repo'
import { ShopItemService } from './shop-item.service'

@Module({
  imports: [forwardRef(() => ShopBannerModule), PokemonModule],
  controllers: [ShopItemController],
  providers: [ShopItemService, ShopItemRepo],
  exports: [ShopItemService, ShopItemRepo]
})
export class ShopItemModule {}
