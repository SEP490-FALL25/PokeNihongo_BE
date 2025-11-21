import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { Module } from '@nestjs/common'
import { WebsocketsModule } from 'src/websockets/websockets.module'
import { LeaderboardSeasonModule } from '../leaderboard-season/leaderboard-season.module'
import { MatchParticipantModule } from '../match-participant/match-participant.module'
import { MatchModule } from '../match/match.module'
import { UserPokemonModule } from '../user-pokemon/user-pokemon.module'
import { MatchQueueController } from './match-queue.controller'
import { MatchQueueRepo } from './match-queue.repo'
import { MatchQueueService } from './match-queue.service'

@Module({
  imports: [
    UserPokemonModule,
    BullQueueModule.registerQueue(
      BullQueue.MATCH_PARTICIPANT_TIMEOUT,
      {},
      true // Sử dụng Redis riêng cho match
    ),
    MatchModule,
    MatchParticipantModule,
    LeaderboardSeasonModule,
    WebsocketsModule
  ],
  controllers: [MatchQueueController],
  providers: [MatchQueueService, MatchQueueRepo],
  exports: [MatchQueueService, MatchQueueRepo]
})
export class MatchQueueModule {}
