import { Module } from '@nestjs/common'
import { TestSetQuestionBankController } from './testset-questionbank.controller'
import { TestSetQuestionBankService } from './testset-questionbank.service'
import { TestSetQuestionBankRepository } from './testset-questionbank.repo'
import { SharedModule } from '@/shared/shared.module'
import { TestSetModule } from '@/modules/testset/testset.module'
import { QuestionBankModule } from '@/modules/question-bank/question-bank.module'

@Module({
    imports: [SharedModule, TestSetModule, QuestionBankModule],
    controllers: [TestSetQuestionBankController],
    providers: [TestSetQuestionBankService, TestSetQuestionBankRepository],
    exports: [TestSetQuestionBankService, TestSetQuestionBankRepository]
})
export class TestSetQuestionBankModule { }
