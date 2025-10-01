import { Module } from '@nestjs/common'
import { SpeechToTextService } from './speech-to-text.service'
import { SpeechController } from './speech.controller'

@Module({
    controllers: [SpeechController],
    providers: [SpeechToTextService],
    exports: [SpeechToTextService]
})
export class SpeechModule { }
