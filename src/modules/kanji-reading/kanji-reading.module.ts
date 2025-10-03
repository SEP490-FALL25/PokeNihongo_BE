import { Module } from '@nestjs/common'
import { KanjiReadingController } from './kanji-reading.controller'
import { KanjiReadingService } from './kanji-reading.service'
import { KanjiReadingRepository } from './kanji-reading.repo'
import { SharedModule } from '@/shared/shared.module'
import { KanjiModule } from '../kanji/kanji.module'

@Module({
    imports: [SharedModule, KanjiModule],
    controllers: [KanjiReadingController],
    providers: [KanjiReadingService, KanjiReadingRepository],
    exports: [KanjiReadingService, KanjiReadingRepository]
})
export class KanjiReadingModule { }

