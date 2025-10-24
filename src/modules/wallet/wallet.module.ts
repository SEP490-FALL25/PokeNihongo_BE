import { Module } from '@nestjs/common'
import { WalletController } from './wallet.controller'
import { WalletRepo } from './wallet.repo'
import { WalletService } from './wallet.service'

@Module({
  imports: [],
  controllers: [WalletController],
  providers: [WalletService, WalletRepo]
})
export class WalletModule {}
