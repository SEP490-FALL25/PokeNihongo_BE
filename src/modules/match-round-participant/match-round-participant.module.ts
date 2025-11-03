import { Module } from '@nestjs/common';
import { MatchRoundParticipantService } from './match-round-participant.service';
import { MatchRoundParticipantController } from './match-round-participant.controller';

@Module({
  controllers: [MatchRoundParticipantController],
  providers: [MatchRoundParticipantService],
})
export class MatchRoundParticipantModule {}
