import { Module } from '@nestjs/common'
import { LessonContentController } from './lesson-content.controller'
import { LessonContentService } from './lesson-content.service'
import { LessonContentRepository } from './lesson-content.repo'
import { SharedModule } from '@/shared/shared.module'

@Module({
    imports: [SharedModule],
    controllers: [LessonContentController],
    providers: [LessonContentService, LessonContentRepository],
    exports: [LessonContentService, LessonContentRepository]
})
export class LessonContentModule { }
