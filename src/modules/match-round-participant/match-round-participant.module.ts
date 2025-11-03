import { Module } from '@nestjs/common'
import { MatchRoundParticipantController } from './match-round-participant.controller'
import { MatchRoundParticipantRepo } from './match-round-participant.repo'
import { MatchRoundParticipantService } from './match-round-participant.service'

@Module({
  controllers: [MatchRoundParticipantController],
  providers: [MatchRoundParticipantService, MatchRoundParticipantRepo]
})
export class MatchRoundParticipantModule {}
