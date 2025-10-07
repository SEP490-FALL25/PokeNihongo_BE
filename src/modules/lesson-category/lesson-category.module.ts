import { Module } from '@nestjs/common'
import { LessonCategoryController } from './lesson-category.controller'
import { LessonCategoryService } from './lesson-category.service'
import { LessonCategoryRepository } from './lesson-category.repo'
import { SharedModule } from '@/shared/shared.module'
import { TranslationModule } from '../translation/translation.module'

@Module({
    imports: [SharedModule, TranslationModule],
    controllers: [LessonCategoryController],
    providers: [LessonCategoryService, LessonCategoryRepository],
    exports: [LessonCategoryService, LessonCategoryRepository]
})
export class LessonCategoryModule { }
