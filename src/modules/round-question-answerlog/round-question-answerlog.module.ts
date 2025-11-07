import { Module } from '@nestjs/common'
import { RoundQuestionsAnswerLogController } from './round-question-answerlog.controller'
import { RoundQuestionsAnswerLogRepo } from './round-question-answerlog.repo'
import { RoundQuestionsAnswerLogService } from './round-question-answerlog.service'

@Module({
  controllers: [RoundQuestionsAnswerLogController],
  providers: [RoundQuestionsAnswerLogService, RoundQuestionsAnswerLogRepo]
})
export class RoundQuestionAnswerlogModule {}
