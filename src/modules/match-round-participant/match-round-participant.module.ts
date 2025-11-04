import { WebsocketsModule } from '@/websockets/websockets.module'
import { forwardRef, Module } from '@nestjs/common'
import { MatchRoundModule } from '../match-round/match-round.module'
import { MatchModule } from '../match/match.module'
import { MatchRoundParticipantController } from './match-round-participant.controller'
import { MatchRoundParticipantRepo } from './match-round-participant.repo'
import { MatchRoundParticipantService } from './match-round-participant.service'

@Module({
  imports: [MatchModule, forwardRef(() => MatchRoundModule), WebsocketsModule],
  controllers: [MatchRoundParticipantController],
  providers: [MatchRoundParticipantService, MatchRoundParticipantRepo],
  exports: [MatchRoundParticipantRepo]
})
export class MatchRoundParticipantModule {}
