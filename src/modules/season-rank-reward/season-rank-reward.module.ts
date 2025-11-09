import { Module } from '@nestjs/common'
import { SeasonRankRewardController } from './season-rank-reward.controller'
import { SeasonRankRewardRepo } from './season-rank-reward.repo'
import { SeasonRankRewardService } from './season-rank-reward.service'

@Module({
  controllers: [SeasonRankRewardController],
  providers: [SeasonRankRewardService, SeasonRankRewardRepo],
  exports: [SeasonRankRewardService, SeasonRankRewardRepo]
})
export class SeasonRankRewardModule {}
