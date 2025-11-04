import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { WebsocketsModule } from '@/websockets/websockets.module'
import { forwardRef, Module } from '@nestjs/common'
import { MatchRoundParticipantModule } from '../match-round-participant/match-round-participant.module'
import { MatchRoundModule } from '../match-round/match-round.module'
import { MatchModule } from '../match/match.module'
import { MatchParticipantController } from './match-participant.controller'
import { MatchParticipantRepo } from './match-participant.repo'
import { MatchParticipantService } from './match-participant.service'

@Module({
  imports: [
    BullQueueModule.registerQueue(BullQueue.MATCH_PARTICIPANT_TIMEOUT),
    BullQueueModule.registerQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT),
    WebsocketsModule,
    MatchModule,
    forwardRef(() => MatchRoundModule),
    forwardRef(() => MatchRoundParticipantModule)
  ],
  controllers: [MatchParticipantController],
  providers: [MatchParticipantService, MatchParticipantRepo],
  exports: [MatchParticipantService, MatchParticipantRepo]
})
export class MatchParticipantModule {}
