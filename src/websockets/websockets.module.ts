import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { SpeechModule } from '@/3rdService/speech/speech.module'
import { UploadModule } from '@/3rdService/upload/upload.module'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { InitializerGateway } from './initializer.gateway'
import { KaiwaGateway } from './kaiwa.gateway'
import { MatchingGateway } from './matching.gateway'
import { SocketServerService } from './socket-server.service'
import { WebsocketsService } from './websockets.service'
import { KaiwaProcessor } from './workers/kaiwa.processor'

// @Global()
@Module({
  imports: [
    BullQueueModule.registerQueue('kaiwa-processor', {
      // Tối ưu queue settings cho performance
      defaultJobOptions: {
        removeOnComplete: 10, // Giữ 10 jobs gần nhất
        removeOnFail: 50, // Giữ 50 failed jobs để debug
        attempts: 2, // Retry 2 lần nếu fail
        backoff: {
          type: 'exponential',
          delay: 2000
        }
      },
      settings: {
        stalledInterval: 30000, // Check stalled jobs mỗi 30s
        maxStalledCount: 1 // Chỉ retry 1 lần nếu stalled
      }
    }),
    ConfigModule, // Cần để inject ConfigService
    UploadModule, // Cần cho TextToSpeechService
    SpeechModule // Cần cho SpeechToTextService và TextToSpeechService
    // MatchRoundModule
  ],
  providers: [
    WebsocketsService,
    SocketServerService,
    InitializerGateway,
    MatchingGateway,
    KaiwaGateway,
    KaiwaProcessor // Processor để xử lý background jobs (optional, có thể dùng sau)
  ],
  exports: [WebsocketsService, SocketServerService, MatchingGateway, KaiwaGateway]
})
export class WebsocketsModule {}
