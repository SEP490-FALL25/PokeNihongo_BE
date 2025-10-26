import { Module, forwardRef } from '@nestjs/common'
import { UserModule } from '../user/user.module'
import { WalletController } from './wallet.controller'
import { WalletRepo } from './wallet.repo'
import { WalletService } from './wallet.service'

@Module({
  imports: [forwardRef(() => UserModule)],
  controllers: [WalletController],
  providers: [WalletService, WalletRepo],
  exports: [WalletService, WalletRepo]
})
export class WalletModule {}
