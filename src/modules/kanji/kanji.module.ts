import { Module } from '@nestjs/common'
import { KanjiController } from './kanji.controller'
import { KanjiService } from './kanji.service'
import { KanjiRepository } from './kanji.repo'
import { SharedModule } from '@/shared/shared.module'

@Module({
    imports: [SharedModule],
    controllers: [KanjiController],
    providers: [KanjiService, KanjiRepository],
    exports: [KanjiService, KanjiRepository]
})
export class KanjiModule { }

