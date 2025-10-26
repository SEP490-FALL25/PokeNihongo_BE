import { Module } from '@nestjs/common'
import { ShopItemController } from './shop-item.controller'
import { ShopItemRepo } from './shop-item.repo'
import { ShopItemService } from './shop-item.service'

@Module({
  controllers: [ShopItemController],
  providers: [ShopItemService, ShopItemRepo],
  exports: [ShopItemService, ShopItemRepo]
})
export class ShopItemModule {}
