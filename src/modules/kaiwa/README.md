# Kaiwa Module - AI Audio Conversation

## Tổng quan

Module **Kaiwa** (会話 - Hội thoại) cung cấp tính năng trò chuyện bằng giọng nói real-time với AI (Gemini 2.5 Flash Native Audio Dialog). Module này hỗ trợ streaming audio 2 chiều và tự động lưu trữ cuộc hội thoại vào database sau khi kết thúc.

## Kiến trúc

Module được thiết kế theo 2 lớp riêng biệt:

### 1. **Lớp Real-time (WebSocket)**

- **File**: `kaiwa.gateway.ts`, `kaiwa.service.ts`
- **Chức năng**:
  - Xử lý kết nối WebSocket
  - Stream audio độ trễ thấp
  - Quản lý state của các cuộc hội thoại đang diễn ra
  - Forward audio giữa client ↔ Gemini AI

### 2. **Lớp Bất đồng bộ (Bull Queue)**

- **File**: `kaiwa.processor.ts`
- **Chức năng**:
  - Upload audio lên cloud storage
  - Tạo transcript từ audio
  - Lưu vào database (Prisma)

## Luồng hoạt động

```
1. Client kết nối WebSocket
   └─> Gateway tạo conversationId
   └─> Service mở stream gRPC với Gemini AI

2. Client gửi audio chunks (real-time)
   └─> Gateway nhận "user-audio-chunk" event
   └─> Service forward đến Gemini AI
   └─> Service lưu chunk vào memory

3. AI trả lời (real-time)
   └─> Service nhận audio chunk từ gRPC
   └─> Gateway emit "ai-audio-chunk" về client
   └─> Service lưu chunk vào memory

4. Client ngắt kết nối
   └─> Gateway trigger handleDisconnect
   └─> Service đóng stream gRPC
   └─> Gateway đẩy job vào Bull queue

5. Bull Worker xử lý (async)
   └─> Processor ghép các audio chunks
   └─> Upload lên cloud storage
   └─> Tạo transcript (Speech-to-Text)
   └─> Lưu vào database (Kaiwa_ai)
```

## Cấu trúc File

```
kaiwa/
├── kaiwa.module.ts              # Module chính
├── kaiwa.gateway.ts             # WebSocket Gateway
├── kaiwa.service.ts             # Service quản lý conversation
├── kaiwa.processor.ts           # Bull Worker
├── services/
│   ├── gemini-grpc-client.service.ts   # gRPC client (mock)
│   ├── cloud-storage.service.ts        # Cloud storage (mock)
│   └── speech-to-text.service.ts       # STT service (mock)
└── README.md
```

## WebSocket API

### Namespace

```
/kaiwa
```

### Authentication

Gửi `userId` qua handshake:

```typescript
const socket = io('ws://localhost:3000/kaiwa', {
  auth: { userId: 123 }
})
```

### Events

#### Client → Server

**`user-audio-chunk`**

```typescript
socket.emit('user-audio-chunk', audioBuffer)
```

- Gửi audio chunk từ microphone
- `audioBuffer`: Buffer chứa audio data

#### Server → Client

**`connected`**

```typescript
socket.on('connected', (data) => {
  console.log(data.conversationId)
})
```

- Nhận sau khi kết nối thành công
- `data.conversationId`: ID của cuộc hội thoại

**`ai-audio-chunk`**

```typescript
socket.on('ai-audio-chunk', (audioBuffer) => {
  playAudio(audioBuffer)
})
```

- Nhận audio response từ AI
- Stream real-time

**`error`**

```typescript
socket.on('error', (error) => {
  console.error(error.message)
})
```

## Database Schema

```prisma
model Kaiwa_ai {
  id             Int       @id @default(autoincrement())
  userId         Int
  conversationId String    @db.VarChar(100)
  role           String    @db.VarChar(20)  // "USER" | "AI"
  audioUrl       String?   @db.VarChar(1000)
  transcript     String?   @db.VarChar(2000)
  model          String?   @db.VarChar(100)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
}
```

## TODO: Production Implementation

### 1. **Gemini gRPC Client** (`gemini-grpc-client.service.ts`)

```typescript
// TODO: Install dependencies
// npm install @grpc/grpc-js @grpc/proto-loader

// TODO: Implement actual gRPC connection
import * as grpc from '@grpc/grpc-js'

// Connect to Gemini 2.5 Flash Native Audio Dialog
// Reference: https://ai.google.dev/gemini-api/docs/audio
```

### 2. **Cloud Storage** (`cloud-storage.service.ts`)

```typescript
// TODO: Choose provider and install
// npm install @google-cloud/storage  // for GCS
// npm install aws-sdk                 // for S3

// TODO: Implement actual upload
import { Storage } from '@google-cloud/storage'
```

### 3. **Speech-to-Text** (`speech-to-text.service.ts`)

```typescript
// TODO: Install Speech-to-Text SDK
// npm install @google-cloud/speech

// TODO: Implement Japanese transcription
import { SpeechClient } from '@google-cloud/speech'
```

### 4. **Audio Processing** (`kaiwa.processor.ts`)

Hàm `stitchAudioChunks()` cần được implement đúng:

- Xử lý audio codec (WebM, Opus, etc.)
- Ghép các chunks đúng cách
- Xử lý silence detection (tách câu)

## Testing

### 1. Test WebSocket Connection

```typescript
// test-client.ts
import { io } from 'socket.io-client'

const socket = io('ws://localhost:3000/kaiwa', {
  auth: { userId: 1 }
})

socket.on('connected', (data) => {
  console.log('Connected:', data)
})

socket.on('ai-audio-chunk', (chunk) => {
  console.log('Received AI audio:', chunk.length, 'bytes')
})

// Send test audio
const testAudio = Buffer.from('TEST_AUDIO_DATA')
socket.emit('user-audio-chunk', testAudio)
```

### 2. Test Bull Queue

```typescript
// Check Redis queue
import { Queue } from 'bull'

const queue = new Queue('kaiwa-processor', {
  redis: { host: 'localhost', port: 6379 }
})

queue.on('completed', (job) => {
  console.log('Job completed:', job.id)
})
```

## Dependencies

Cần cài đặt:

```bash
npm install uuid
npm install @nestjs/websockets @nestjs/platform-socket.io
npm install @nestjs/bull bull
```

## Configuration

Thêm vào `.env`:

```env
# Redis for Bull
REDIS_URI=redis://localhost:6379

# Cloud Storage (example for GCS)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_STORAGE_BUCKET=your-bucket-name

# Speech-to-Text
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

## Integration với App Module

Thêm vào `app.module.ts`:

```typescript
import { KaiwaModule } from './modules/kaiwa/kaiwa.module'

@Module({
  imports: [
    // ... other modules
    KaiwaModule
  ]
})
export class AppModule {}
```

## Performance Considerations

1. **Memory Management**: Conversation state được lưu trong memory. Cần implement cleanup cho conversations timeout.

2. **Audio Chunk Size**: Optimize chunk size để cân bằng giữa latency và bandwidth.

3. **Bull Concurrency**: Configure số worker concurrent trong processor.

4. **Rate Limiting**: Implement rate limiting cho WebSocket connections.

## Security

1. **Authentication**: Implement proper JWT authentication cho WebSocket.

2. **Authorization**: Verify user có quyền access conversation.

3. **Data Sanitization**: Validate audio data trước khi processing.

4. **Storage Security**: Use signed URLs cho private audio access.

## Monitoring

1. **WebSocket Metrics**: Track active connections, message rate.

2. **Bull Queue Metrics**: Monitor job success/failure rates.

3. **Storage Metrics**: Track upload success rate, file sizes.

4. **Transcript Quality**: Monitor Speech-to-Text confidence scores.

---

**Created**: 2025-11-05  
**Author**: AI Assistant  
**Version**: 1.0.0 (Mock Implementation)
