import { WebsocketsModule } from '@/websockets/websockets.module'
import { BullModule } from '@nestjs/bull'
import { Module } from '@nestjs/common'
import { GeminiConfigModule } from '../gemini-config/gemini-config.module'
import { KaiwaProcessor } from './kaiwa.processor'
import { KaiwaService } from './kaiwa.service'
import { CloudStorageService } from './services/cloud-storage.service'
import { GeminiGrpcClientService } from './services/gemini-grpc-client.service'
import { SpeechToTextService } from './services/speech-to-text.service'

@Module({
  imports: [
    WebsocketsModule,
    GeminiConfigModule,
    BullModule.registerQueue({
      name: 'kaiwa-processor'
    })
  ],
  providers: [
    KaiwaService,
    KaiwaProcessor,
    GeminiGrpcClientService,
    CloudStorageService,
    SpeechToTextService
  ],
  exports: [KaiwaService]
})
export class KaiwaModule {}
