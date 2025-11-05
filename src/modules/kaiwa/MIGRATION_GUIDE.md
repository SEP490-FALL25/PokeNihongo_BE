# Kaiwa Module - Migration & Deployment Guide

## ✅ Completed

Tôi đã tạo đầy đủ module **Kaiwa** (AI Audio Conversation) cho ứng dụng của bạn với các file sau:

### Files Created

```
src/modules/kaiwa/
├── kaiwa.module.ts                          ✅ Module chính
├── kaiwa.gateway.ts                         ✅ WebSocket Gateway
├── kaiwa.service.ts                         ✅ Service quản lý hội thoại
├── kaiwa.processor.ts                       ✅ Bull Worker
├── services/
│   ├── gemini-grpc-client.service.ts        ✅ gRPC client (mock)
│   ├── cloud-storage.service.ts             ✅ Cloud storage (mock)
│   └── speech-to-text.service.ts            ✅ STT service (mock)
├── README.md                                ✅ Documentation
├── MIGRATION_GUIDE.md                       ✅ This file
└── test-client.example.ts                   ✅ Test client example
```

### App Module Integration

```typescript
// src/app.module.ts
import { KaiwaModule } from './modules/kaiwa/kaiwa.module';

@Module({
  imports: [
    // ... other modules
    KaiwaModule  ✅ Added
  ]
})
```

---

## 🔧 Next Steps - Production Implementation

### 1. Install Required Packages

```bash
# gRPC for Gemini communication
npm install @grpc/grpc-js @grpc/proto-loader

# Cloud Storage (choose one)
npm install @google-cloud/storage  # For Google Cloud Storage
# OR
npm install aws-sdk                 # For AWS S3

# Speech-to-Text
npm install @google-cloud/speech    # Google Cloud Speech-to-Text
```

**Packages already installed** ✅:

- `uuid` (for conversation IDs)
- `@nestjs/bull` (for queue processing)
- `@nestjs/websockets` (for WebSocket)
- `socket.io` (WebSocket implementation)

---

### 2. Environment Variables

Add to `.env`:

```env
# Redis (for Bull Queue)
REDIS_URI=redis://localhost:6379

# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# Cloud Storage
GOOGLE_CLOUD_STORAGE_BUCKET=your-audio-bucket-name

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
GEMINI_AUDIO_MODEL=gemini-2.5-flash-native-audio-dialog
```

---

### 3. Implement Real Services

#### 3.1. Gemini gRPC Client (`gemini-grpc-client.service.ts`)

**Current**: Mock implementation with EventEmitter  
**TODO**: Connect to actual Gemini 2.5 Flash Native Audio Dialog API

```typescript
// Example implementation structure
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'

@Injectable()
export class GeminiGrpcClientService {
  private client: any // Gemini gRPC client

  constructor(private configService: ConfigService) {
    // Load proto file
    const packageDefinition = protoLoader.loadSync('gemini-audio.proto')
    const proto = grpc.loadPackageDefinition(packageDefinition)

    // Create client
    this.client = new proto.GeminiAudioService(
      'generativelanguage.googleapis.com:443',
      grpc.credentials.createSsl()
    )
  }

  async startBidirectionalStream(prompt: string): Promise<Duplex> {
    const stream = this.client.StreamingAudioChat()

    // Send initial config
    stream.write({
      config: {
        model: 'gemini-2.5-flash-native-audio-dialog',
        prompt,
        apiKey: this.configService.get('GEMINI_API_KEY')
      }
    })

    return stream
  }
}
```

**References**:

- https://ai.google.dev/gemini-api/docs/audio
- https://ai.google.dev/gemini-api/docs/models/gemini-v2

---

#### 3.2. Cloud Storage (`cloud-storage.service.ts`)

**Current**: Returns fake URLs  
**TODO**: Upload to actual cloud storage (GCS or S3)

**Option A: Google Cloud Storage**

```typescript
import { Storage } from '@google-cloud/storage'

@Injectable()
export class CloudStorageService {
  private storage: Storage
  private bucket: string

  constructor(private configService: ConfigService) {
    this.storage = new Storage({
      projectId: configService.get('GOOGLE_CLOUD_PROJECT_ID'),
      keyFilename: configService.get('GOOGLE_APPLICATION_CREDENTIALS')
    })
    this.bucket = configService.get('GOOGLE_CLOUD_STORAGE_BUCKET')
  }

  async upload(file: Buffer, path: string): Promise<string> {
    const bucket = this.storage.bucket(this.bucket)
    const blob = bucket.file(path)

    await blob.save(file, {
      contentType: 'audio/webm',
      metadata: {
        cacheControl: 'public, max-age=31536000'
      }
    })

    // Return public URL or signed URL
    return `https://storage.googleapis.com/${this.bucket}/${path}`
  }
}
```

**Option B: AWS S3**

```typescript
import * as AWS from 'aws-sdk'

@Injectable()
export class CloudStorageService {
  private s3: AWS.S3
  private bucket: string

  constructor(private configService: ConfigService) {
    this.s3 = new AWS.S3({
      accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
      region: configService.get('AWS_REGION')
    })
    this.bucket = configService.get('AWS_S3_BUCKET')
  }

  async upload(file: Buffer, path: string): Promise<string> {
    const params = {
      Bucket: this.bucket,
      Key: path,
      Body: file,
      ContentType: 'audio/webm',
      ACL: 'public-read'
    }

    const result = await this.s3.upload(params).promise()
    return result.Location
  }
}
```

---

#### 3.3. Speech-to-Text (`speech-to-text.service.ts`)

**Current**: Returns mock transcripts  
**TODO**: Use Google Cloud Speech-to-Text API

```typescript
import { SpeechClient } from '@google-cloud/speech'

@Injectable()
export class SpeechToTextService {
  private client: SpeechClient

  constructor() {
    this.client = new SpeechClient()
  }

  async transcript(file: Buffer): Promise<string> {
    const audio = {
      content: file.toString('base64')
    }

    const config = {
      encoding: 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'ja-JP',
      model: 'latest_long',
      enableAutomaticPunctuation: true
    }

    const request = {
      audio,
      config
    }

    try {
      const [response] = await this.client.recognize(request)
      const transcription = response.results
        .map((result) => result.alternatives[0].transcript)
        .join('\n')

      return transcription || ''
    } catch (error) {
      this.logger.error('Speech-to-Text error:', error)
      return ''
    }
  }
}
```

---

### 4. Audio Processing (`kaiwa.processor.ts`)

**Current**: Simple `Buffer.concat()` for stitching  
**TODO**: Proper audio processing

The `stitchAudioChunks()` method needs improvement:

```typescript
import * as ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import { join } from 'path';

private async stitchAudioChunks(
  messages: Array<{ role: 'USER' | 'AI'; chunk: Buffer }>
): Promise<ProcessedMessage[]> {
  const processed: ProcessedMessage[] = [];

  // Group consecutive chunks by role
  const groups = this.groupMessagesByRole(messages);

  for (const group of groups) {
    try {
      // Write chunks to temp files
      const tempFiles = await Promise.all(
        group.chunks.map(async (chunk, i) => {
          const tempPath = join('/tmp', `chunk_${Date.now()}_${i}.webm`);
          await fs.writeFile(tempPath, chunk);
          return tempPath;
        })
      );

      // Merge using ffmpeg
      const outputPath = join('/tmp', `merged_${Date.now()}.webm`);
      await this.mergeAudioFiles(tempFiles, outputPath);

      // Read merged file
      const mergedBuffer = await fs.readFile(outputPath);

      processed.push({
        role: group.role,
        fullAudio: mergedBuffer
      });

      // Cleanup temp files
      await Promise.all([
        ...tempFiles.map(f => fs.unlink(f)),
        fs.unlink(outputPath)
      ]);
    } catch (error) {
      this.logger.error('Error stitching audio:', error);
    }
  }

  return processed;
}

private mergeAudioFiles(inputs: string[], output: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();
    inputs.forEach(input => command.input(input));

    command
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .mergeToFile(output, '/tmp');
  });
}
```

**Install**:

```bash
npm install fluent-ffmpeg
npm install @types/fluent-ffmpeg --save-dev
```

---

### 5. Database Migration

The `Kaiwa_ai` model already exists in `schema.prisma`. No migration needed! ✅

---

### 6. Testing

#### 6.1. Test WebSocket Connection

```bash
# Run the example test client
npx ts-node src/modules/kaiwa/test-client.example.ts
```

#### 6.2. Monitor Bull Queue

```typescript
// Check job status in Bull Board (optional)
npm install @bull-board/express
npm install @bull-board/api
```

Add to `main.ts`:

```typescript
import { createBullBoard } from '@bull-board/api'
import { BullAdapter } from '@bull-board/api/bullAdapter'
import { ExpressAdapter } from '@bull-board/express'

// ... in bootstrap()
const serverAdapter = new ExpressAdapter()
serverAdapter.setBasePath('/admin/queues')

const { addQueue } = createBullBoard({
  queues: [new BullAdapter(kaiwaQueue)],
  serverAdapter
})

app.use('/admin/queues', serverAdapter.getRouter())
```

Access at: `http://localhost:3000/admin/queues`

---

### 7. Security & Production Considerations

#### 7.1. Authentication

Current implementation extracts `userId` from handshake:

```typescript
const userId = client.handshake.auth?.userId
```

**TODO**: Implement JWT authentication:

```typescript
import { JwtService } from '@nestjs/jwt'

@WebSocketGateway()
export class KaiwaGateway {
  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token
      const payload = await this.jwtService.verifyAsync(token)
      client.data.userId = payload.userId
      // ... continue
    } catch {
      client.disconnect()
    }
  }
}
```

#### 7.2. Rate Limiting

Add WebSocket rate limiting:

```typescript
import { ThrottlerGuard } from '@nestjs/throttler'

@UseGuards(ThrottlerGuard)
@WebSocketGateway()
export class KaiwaGateway {
  // ...
}
```

#### 7.3. Conversation Timeout

Add cleanup for idle conversations:

```typescript
// In kaiwa.service.ts
private readonly CONVERSATION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

startConversation(client: Socket, conversationId: string, userId: number) {
  // ... existing code

  // Set timeout
  const timeout = setTimeout(() => {
    this.endConversation(conversationId);
    client.emit('timeout', { message: 'Conversation timeout' });
    client.disconnect();
  }, this.CONVERSATION_TIMEOUT);

  conversation.timeout = timeout;
}

endConversation(conversationId: string) {
  const conversation = this.conversations.get(conversationId);
  if (conversation?.timeout) {
    clearTimeout(conversation.timeout);
  }
  // ... existing code
}
```

---

### 8. Monitoring & Logging

#### 8.1. Add Metrics

```typescript
// Track active conversations
@Injectable()
export class KaiwaService {
  getActiveConversationsCount(): number {
    return this.conversations.size
  }

  getConversationsByUser(userId: number): number {
    return Array.from(this.conversations.values()).filter((c) => c.userId === userId)
      .length
  }
}
```

#### 8.2. Health Check

```typescript
// kaiwa.controller.ts (optional)
@Controller('kaiwa')
export class KaiwaController {
  constructor(private kaiwaService: KaiwaService) {}

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      activeConversations: this.kaiwaService.getActiveConversationsCount()
    }
  }
}
```

---

## 🚀 Deployment Checklist

- [ ] Install all required packages
- [ ] Set up environment variables
- [ ] Configure Google Cloud credentials
- [ ] Create Cloud Storage bucket
- [ ] Enable Speech-to-Text API
- [ ] Enable Gemini API access
- [ ] Implement Gemini gRPC client
- [ ] Implement Cloud Storage upload
- [ ] Implement Speech-to-Text
- [ ] Improve audio stitching logic
- [ ] Add JWT authentication
- [ ] Add rate limiting
- [ ] Add conversation timeout
- [ ] Set up monitoring
- [ ] Test WebSocket connection
- [ ] Test Bull queue processing
- [ ] Load test with multiple concurrent users
- [ ] Deploy Redis instance
- [ ] Configure CORS for WebSocket
- [ ] Set up logging/alerting

---

## 📝 Notes

1. **Cost Optimization**:

   - Gemini API có giới hạn requests
   - Cloud Storage có chi phí lưu trữ
   - Speech-to-Text có chi phí per minute

2. **Scalability**:

   - Consider using Redis Cluster for Bull
   - Consider using sticky sessions for WebSocket
   - Consider using load balancer with WebSocket support

3. **Data Retention**:
   - Implement cleanup policy for old audio files
   - Add `deletedAt` soft delete for conversations

---

**Created**: 2025-11-05  
**Status**: ✅ Mock implementation ready for production upgrade
