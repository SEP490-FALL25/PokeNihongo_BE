import { Module } from '@nestjs/common'
import { QuestionController } from './question.controller'
import { QuestionService } from './question.service'
import { QuestionRepository } from './question.repo'
import { SharedModule } from '@/shared/shared.module'

@Module({
    imports: [SharedModule],
    controllers: [QuestionController],
    providers: [QuestionService, QuestionRepository],
    exports: [QuestionService, QuestionRepository],
})
export class QuestionModule { }
