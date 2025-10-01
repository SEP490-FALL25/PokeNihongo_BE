import { Module } from '@nestjs/common'
import { VocabularyController } from './vocabulary.controller'
import { VocabularyRepository } from './vocabulary.repo'
import { VocabularyService } from './vocabulary.service'
import { UploadModule } from '@/3rdService/upload/upload.module'

@Module({
    imports: [UploadModule],
    controllers: [VocabularyController],
    providers: [VocabularyService, VocabularyRepository],
    exports: [VocabularyService, VocabularyRepository]
})
export class VocabularyModule { }
