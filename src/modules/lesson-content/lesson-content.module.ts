import { Module } from '@nestjs/common'
import { LessonContentController } from './lesson-content.controller'
import { LessonContentService } from './lesson-content.service'
import { LessonContentRepository } from './lesson-content.repo'
import { SharedModule } from '@/shared/shared.module'
import { VocabularyModule } from '../vocabulary/vocabulary.module'
import { GrammarModule } from '../grammar/grammar.module'
import { GrammarRepository } from '../grammar/grammar.repo'
import { KanjiModule } from '../kanji/kanji.module'
import { TranslationModule } from '../translation/translation.module'
import { LanguagesModule } from '../languages/languages.module'
import { MeaningModule } from '../meaning/meaning.module'

@Module({
    imports: [
        SharedModule,
        VocabularyModule,
        GrammarModule,
        KanjiModule,
        TranslationModule,
        LanguagesModule,
        MeaningModule
    ],
    controllers: [LessonContentController],
    providers: [LessonContentService, LessonContentRepository, GrammarRepository],
    exports: [LessonContentService, LessonContentRepository]
})
export class LessonContentModule { }
