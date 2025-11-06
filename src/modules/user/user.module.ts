import { MailModule } from '@/3rdService/mail/mail.module'
import { LevelRepo } from '@/modules/level/level.repo'
import { UserPokemonRepo } from '@/modules/user-pokemon/user-pokemon.repo'
import { SharedModule } from '@/shared/shared.module'
import { forwardRef, Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { LeaderboardSeasonModule } from '../leaderboard-season/leaderboard-season.module'
import { MatchModule } from '../match/match.module'
import { UserSeasonHistoryModule } from '../user-season-history/user-season-history.module'
import { WalletModule } from '../wallet/wallet.module'
import { UserController } from './user.controller'
import { UserRepo } from './user.repo'
import { UserService } from './user.service'

@Module({
  imports: [
    SharedModule,
    MailModule,
    forwardRef(() => WalletModule),
    LeaderboardSeasonModule,
    MatchModule,
    UserSeasonHistoryModule,
    LanguagesModule
  ],
  controllers: [UserController],
  providers: [UserService, UserRepo, UserPokemonRepo, LevelRepo],
  exports: [UserService, UserRepo]
})
export class UserModule {}
