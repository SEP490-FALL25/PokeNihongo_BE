import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { GeminiService } from './gemini.service'
import { GeminiController } from './gemini.controller'
import { VertexAIService } from './vertex-ai.service'
import { VertexAIController } from './vertex-ai.controller'
import geminiConfig from './config/gemini.config'
import { PrismaService } from '@/shared/services/prisma.service'
import { GeminiConfigModule } from '@/modules/gemini-config/gemini-config.module'
import { SpeechModule } from '../speech/speech.module'
import { UploadModule } from '../upload/upload.module'
import { DataAccessService } from '@/shared/services/data-access.service'

@Module({
    imports: [
        ConfigModule.forFeature(geminiConfig),
        GeminiConfigModule,
        SpeechModule,
        UploadModule // Thêm UploadModule để GeminiService có thể sử dụng UploadService
    ],
    controllers: [GeminiController, VertexAIController],
    providers: [
        GeminiService,
        VertexAIService,
        PrismaService,
        DataAccessService
    ],
    exports: [GeminiService, VertexAIService] // Export để SharedModule và các module khác có thể sử dụng
})
export class GeminiModule { }
