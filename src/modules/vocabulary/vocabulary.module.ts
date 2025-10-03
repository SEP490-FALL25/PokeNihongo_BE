import { Module } from '@nestjs/common'
import { VocabularyController } from './vocabulary.controller'
import { VocabularyRepository } from './vocabulary.repo'
import { VocabularyService } from './vocabulary.service'
import { UploadModule } from '@/3rdService/upload/upload.module'
import { SpeechModule } from '@/3rdService/speech/speech.module'

@Module({
    imports: [UploadModule, SpeechModule],
    controllers: [VocabularyController],
    providers: [VocabularyService, VocabularyRepository],
    exports: [VocabularyService, VocabularyRepository]
})
export class VocabularyModule { }
