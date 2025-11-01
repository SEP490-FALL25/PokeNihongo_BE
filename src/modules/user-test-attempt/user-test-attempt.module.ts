import { Module } from '@nestjs/common'
import { UserTestAttemptController } from './user-test-attempt.controller'
import { UserTestAttemptRepository } from './user-test-attempt.repo'
import { UserTestAttemptService } from './user-test-attempt.service'
import { QuestionBankModule } from '../question-bank/question-bank.module'
import { UserTestAnswerLogModule } from '../user-test-answer-log/user-test-answer-log.module'
import { TestModule } from '../test/test.module'
import { TestSetModule } from '../testset/testset.module'
import { TestSetQuestionBankModule } from '../testset-questionbank/testset-questionbank.module'
import { TranslationModule } from '../translation/translation.module'
import { PrismaService } from '@/shared/services/prisma.service'

@Module({
    imports: [
        QuestionBankModule,
        UserTestAnswerLogModule,
        TestModule,
        TestSetModule,
        TestSetQuestionBankModule,
        TranslationModule
    ],
    controllers: [UserTestAttemptController],
    providers: [UserTestAttemptService, UserTestAttemptRepository, PrismaService],
    exports: [UserTestAttemptService, UserTestAttemptRepository]
})
export class UserTestAttemptModule { }

