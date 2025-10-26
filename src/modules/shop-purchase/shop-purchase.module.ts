import { Module } from '@nestjs/common'
import { PokemonModule } from '../pokemon/pokemon.module'
import { ShopItemModule } from '../shop-item/shop-item.module'
import { UserPokemonModule } from '../user-pokemon/user-pokemon.module'
import { WalletTransactionModule } from '../wallet-transaction/wallet-transaction.module'
import { WalletModule } from '../wallet/wallet.module'
import { ShopPurchaseController } from './shop-purchase.controller'
import { ShopPurchaseRepo } from './shop-purchase.repo'
import { ShopPurchaseService } from './shop-purchase.service'

@Module({
  imports: [
    ShopItemModule,
    UserPokemonModule,
    WalletTransactionModule,
    WalletModule,
    PokemonModule
  ],
  controllers: [ShopPurchaseController],
  providers: [ShopPurchaseService, ShopPurchaseRepo],
  exports: [ShopPurchaseRepo, ShopPurchaseService]
})
export class ShopPurchaseModule {}
