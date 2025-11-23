import { Module, forwardRef } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { PokemonModule } from '../pokemon/pokemon.module'
import { TranslationModule } from '../translation/translation.module'
import { UserPokemonModule } from '../user-pokemon/user-pokemon.module'
import { UserRewardHistoryModule } from '../user-reward-history/user-reward-history.module'
import { UserModule } from '../user/user.module'
import { WalletModule } from '../wallet/wallet.module'
import { RewardController } from './reward.controller'
import { RewardRepo } from './reward.repo'
import { RewardService } from './reward.service'

@Module({
  imports: [
    LanguagesModule,
    TranslationModule,
    forwardRef(() => UserModule),
    forwardRef(() => WalletModule),
    PokemonModule,
    UserPokemonModule,
    forwardRef(() => UserRewardHistoryModule)
  ],
  controllers: [RewardController],
  providers: [RewardService, RewardRepo],
  exports: [RewardService, RewardRepo]
})
export class RewardModule { }
