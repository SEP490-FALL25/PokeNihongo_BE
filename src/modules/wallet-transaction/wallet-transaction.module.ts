import { Module } from '@nestjs/common'
import { WalletTransactionController } from './wallet-transaction.controller'
import { WalletTransactionRepo } from './wallet-transaction.repo'
import { WalletTransactionService } from './wallet-transaction.service'

@Module({
  controllers: [WalletTransactionController],
  providers: [WalletTransactionService, WalletTransactionRepo]
})
export class WalletTransactionModule {}
