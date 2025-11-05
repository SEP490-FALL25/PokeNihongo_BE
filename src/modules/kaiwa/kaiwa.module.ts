import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { KaiwaGateway } from './kaiwa.gateway';
import { KaiwaService } from './kaiwa.service';
import { KaiwaProcessor } from './kaiwa.processor';
import { GeminiGrpcClientService } from './services/gemini-grpc-client.service';
import { CloudStorageService } from './services/cloud-storage.service';
import { SpeechToTextService } from './services/speech-to-text.service';
import { SharedModule } from '@/shared/shared.module';
import { GeminiConfigModule } from '../gemini-config/gemini-config.module';

@Module({
    imports: [
        SharedModule,
        GeminiConfigModule,
        BullModule.registerQueue({
            name: 'kaiwa-processor'
        })
    ],
    providers: [
        KaiwaGateway,
        KaiwaService,
        KaiwaProcessor,
        GeminiGrpcClientService,
        CloudStorageService,
        SpeechToTextService
    ],
    exports: [KaiwaService]
})
export class KaiwaModule { }

