import { Module } from '@nestjs/common'
import { QuestionBankController } from './question-bank.controller'
import { QuestionBankRepository } from './question-bank.repo'
import { QuestionBankService } from './question-bank.service'

@Module({
    imports: [],
    controllers: [QuestionBankController],
    providers: [QuestionBankService, QuestionBankRepository],
    exports: [QuestionBankService, QuestionBankRepository]
})
export class QuestionBankModule { }

