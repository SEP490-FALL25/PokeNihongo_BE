import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { LeaderboardSeasonModule } from '../leaderboard-season/leaderboard-season.module'
import { MatchModule } from '../match/match.module'
import { MatchRoundController } from './match-round.controller'
import { MatchRoundRepo } from './match-round.repo'
import { MatchRoundService } from './match-round.service'

@Module({
  imports: [MatchModule, LanguagesModule, LeaderboardSeasonModule],
  controllers: [MatchRoundController],
  providers: [MatchRoundService, MatchRoundRepo]
})
export class MatchRoundModule {}
