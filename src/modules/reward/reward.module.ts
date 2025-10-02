import { Module } from '@nestjs/common'
import { RewardController } from './reward.controller'
import { RewardRepo } from './reward.repo'
import { RewardService } from './reward.service'

@Module({
  controllers: [RewardController],
  providers: [RewardService, RewardRepo]
})
export class RewardModule {}
