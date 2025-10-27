import { forwardRef, Module } from '@nestjs/common'
import { GachaBannerModule } from '../gacha-banner/gacha-banner.module'
import { GachaItemRateModule } from '../gacha-item-rate/gacha-item-rate.module'
import { PokemonModule } from '../pokemon/pokemon.module'
import { GachaItemController } from './gacha-item.controller'
import { GachaItemRepo } from './gacha-item.repo'
import { GachaItemService } from './gacha-item.service'

@Module({
  imports: [forwardRef(() => GachaBannerModule), GachaItemRateModule, PokemonModule],
  controllers: [GachaItemController],
  providers: [GachaItemService, GachaItemRepo],
  exports: [GachaItemService, GachaItemRepo]
})
export class GachaItemModule {}
