import { Module } from '@nestjs/common'
import { QuestionController } from './question.controller'
import { QuestionService } from './question.service'
import { QuestionRepository } from './question.repo'
import { SharedModule } from '@/shared/shared.module'
import { TranslationModule } from '@/modules/translation/translation.module'
import { LanguagesModule } from '@/modules/languages/languages.module'

@Module({
    imports: [SharedModule, TranslationModule, LanguagesModule],
    controllers: [QuestionController],
    providers: [QuestionService, QuestionRepository],
    exports: [QuestionService, QuestionRepository],
})
export class QuestionModule { }
