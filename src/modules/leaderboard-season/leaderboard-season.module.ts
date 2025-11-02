import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { LeaderboardSeasonController } from './leaderboard-season.controller'
import { LeaderboardSeasonRepo } from './leaderboard-season.repo'
import { LeaderboardSeasonService } from './leaderboard-season.service'

@Module({
  imports: [TranslationModule, LanguagesModule],
  controllers: [LeaderboardSeasonController],
  providers: [LeaderboardSeasonService, LeaderboardSeasonRepo]
})
export class LeaderboardSeasonModule {}
