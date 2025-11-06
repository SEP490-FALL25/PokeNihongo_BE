import { Module } from '@nestjs/common'
import { RoundQuestionController } from './round-question.controller'
import { RoundQuestionRepo } from './round-question.repo'
import { RoundQuestionService } from './round-question.service'

@Module({
  controllers: [RoundQuestionController],
  providers: [RoundQuestionService, RoundQuestionRepo],
  exports: [RoundQuestionService, RoundQuestionRepo]
})
export class RoundQuestionModule {}
