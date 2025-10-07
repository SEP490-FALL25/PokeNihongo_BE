import { Module } from '@nestjs/common'
import { AnswerController } from './answer.controller'
import { AnswerService } from './answer.service'
import { AnswerRepository } from './answer.repo'
import { SharedModule } from '@/shared/shared.module'

@Module({
    imports: [SharedModule],
    controllers: [AnswerController],
    providers: [AnswerService, AnswerRepository],
    exports: [AnswerService, AnswerRepository],
})
export class AnswerModule { }
