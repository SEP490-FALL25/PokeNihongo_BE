import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GeminiService } from './gemini.service'
import { GeminiController } from './gemini.controller'
import geminiConfig from './config/gemini.config'
import { PrismaService } from '@/shared/services/prisma.service'
import { GeminiConfigModule } from '@/modules/gemini-config/gemini-config.module'
import { SpeechModule } from '../speech/speech.module'
import { SpeakingModule } from '@/modules/speaking/speaking.module'

@Module({
    imports: [
        ConfigModule.forFeature(geminiConfig),
        GeminiConfigModule,
        SpeechModule,
        SpeakingModule
    ],
    controllers: [GeminiController],
    providers: [
        GeminiService,
        PrismaService
    ],
    exports: [GeminiService]
})
export class GeminiModule { }
