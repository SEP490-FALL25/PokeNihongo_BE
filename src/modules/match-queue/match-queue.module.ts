import { Module } from '@nestjs/common'
import { MatchQueueController } from './match-queue.controller'
import { MatchQueueRepo } from './match-queue.repo'
import { MatchQueueService } from './match-queue.service'

@Module({
  controllers: [MatchQueueController],
  providers: [MatchQueueService, MatchQueueRepo]
})
export class MatchQueueModule {}
