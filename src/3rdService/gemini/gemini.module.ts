import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GeminiService } from './gemini.service'
import { GeminiController } from './gemini.controller'
import geminiConfig from './config/gemini.config'
import { PrismaService } from '@/shared/services/prisma.service'
import { GeminiConfigModule } from '@/modules/gemini-config/gemini-config.module'
import { SpeechModule } from '../speech/speech.module'
import { SpeakingModule } from '@/modules/speaking/speaking.module'
import { UploadModule } from '../upload/upload.module'

@Module({
    imports: [
        ConfigModule.forFeature(geminiConfig),
        GeminiConfigModule,
        SpeechModule,
        SpeakingModule,
        UploadModule // Thêm UploadModule để GeminiService có thể sử dụng UploadService
    ],
    controllers: [GeminiController],
    providers: [
        GeminiService,
        PrismaService
    ],
    exports: [GeminiService] // Export để SharedModule và các module khác có thể sử dụng
})
export class GeminiModule { }
