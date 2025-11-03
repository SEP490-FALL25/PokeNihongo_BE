import { Module } from '@nestjs/common'
import { MatchParticipantController } from './match-participant.controller'
import { MatchParticipantRepo } from './match-participant.repo'
import { MatchParticipantService } from './match-participant.service'

@Module({
  controllers: [MatchParticipantController],
  providers: [MatchParticipantService, MatchParticipantRepo]
})
export class MatchParticipantModule {}
