import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { forwardRef, Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { LeaderboardSeasonModule } from '../leaderboard-season/leaderboard-season.module'
import { MatchRoundParticipantModule } from '../match-round-participant/match-round-participant.module'
import { MatchModule } from '../match/match.module'
import { RoundQuestionModule } from '../round-question/round-question.module'
import { MatchRoundController } from './match-round.controller'
import { MatchRoundRepo } from './match-round.repo'
import { MatchRoundService } from './match-round.service'

@Module({
  imports: [
    BullQueueModule.registerQueue(
      BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT,
      {},
      true // Sử dụng Redis riêng cho match
    ),
    MatchModule,
    LanguagesModule,
    LeaderboardSeasonModule,
    forwardRef(() => MatchRoundParticipantModule),
    RoundQuestionModule
  ],
  controllers: [MatchRoundController],
  providers: [MatchRoundService, MatchRoundRepo],
  exports: [MatchRoundRepo]
})
export class MatchRoundModule {}
