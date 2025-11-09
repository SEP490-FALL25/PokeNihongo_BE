import { Module } from '@nestjs/common'
import { LeaderboardSeasonModule } from '../leaderboard-season/leaderboard-season.module'
import { SeasonRankRewardController } from './season-rank-reward.controller'
import { SeasonRankRewardRepo } from './season-rank-reward.repo'
import { SeasonRankRewardService } from './season-rank-reward.service'

@Module({
  imports: [LeaderboardSeasonModule],
  controllers: [SeasonRankRewardController],
  providers: [SeasonRankRewardService, SeasonRankRewardRepo],
  exports: [SeasonRankRewardService, SeasonRankRewardRepo]
})
export class SeasonRankRewardModule {}
