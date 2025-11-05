# ✅ Kaiwa Module - Implementation Checklist

## 📋 Development Checklist

### Phase 1: Setup & Test (DONE ✅)

- [x] Create module structure
- [x] Implement WebSocket Gateway
- [x] Implement Conversation Service
- [x] Implement Bull Processor
- [x] Create mock services (Gemini, Storage, STT)
- [x] Integrate into app.module.ts
- [x] Write documentation
- [x] Create test client
- [x] Fix linter errors (ZERO errors ✨)

### Phase 2: Local Testing (DO THIS NOW)

- [ ] Start backend server (`npm run dev`)
- [ ] Run test client (`npx ts-node src/modules/kaiwa/test-client.example.ts`)
- [ ] Verify WebSocket connection
- [ ] Verify audio streaming (mock)
- [ ] Verify disconnect triggers Bull job
- [ ] Check Redis queue (Bull Board or CLI)
- [ ] Verify database saves (check Kaiwa_ai table)

### Phase 3: Frontend Integration (NEXT)

- [ ] Create WebSocket client in frontend
- [ ] Implement microphone capture
- [ ] Stream audio chunks to server
- [ ] Receive and play AI audio
- [ ] Handle connection errors
- [ ] Add UI indicators (connecting, connected, streaming, etc.)
- [ ] Test with real audio input

### Phase 4: Production Implementation (LATER)

- [ ] Install production packages

  - [ ] `@grpc/grpc-js`
  - [ ] `@grpc/proto-loader`
  - [ ] `@google-cloud/storage` or `aws-sdk`
  - [ ] `@google-cloud/speech`
  - [ ] `fluent-ffmpeg` (optional)

- [ ] Setup Google Cloud

  - [ ] Create GCP project
  - [ ] Enable Gemini API
  - [ ] Enable Speech-to-Text API
  - [ ] Enable Cloud Storage API
  - [ ] Create service account
  - [ ] Download credentials JSON
  - [ ] Create storage bucket

- [ ] Implement Gemini gRPC Client

  - [ ] Load proto definitions
  - [ ] Create gRPC client
  - [ ] Connect to Gemini endpoint
  - [ ] Handle authentication (API key)
  - [ ] Test bidirectional streaming

- [ ] Implement Cloud Storage

  - [ ] Configure credentials
  - [ ] Test file upload
  - [ ] Test public URL generation
  - [ ] (Optional) Implement signed URLs

- [ ] Implement Speech-to-Text

  - [ ] Configure credentials
  - [ ] Test Japanese transcription
  - [ ] Handle different audio formats
  - [ ] Test confidence scoring

- [ ] Improve Audio Processing
  - [ ] Install ffmpeg
  - [ ] Implement proper stitching
  - [ ] Handle silence detection
  - [ ] Optimize file sizes

### Phase 5: Security & Performance (BEFORE DEPLOY)

- [ ] Add JWT authentication

  - [ ] Implement WebSocket auth middleware
  - [ ] Verify token on connection
  - [ ] Handle token expiration

- [ ] Add rate limiting

  - [ ] Install `@nestjs/throttler`
  - [ ] Configure limits
  - [ ] Test rate limiting

- [ ] Add conversation timeout

  - [ ] Implement idle timeout (30 min)
  - [ ] Cleanup resources
  - [ ] Notify client

- [ ] Add monitoring

  - [ ] Track active connections
  - [ ] Monitor Bull queue
  - [ ] Log errors to service (Sentry, etc.)
  - [ ] Add health check endpoint

- [ ] Load testing
  - [ ] Test with multiple concurrent users
  - [ ] Measure latency
  - [ ] Identify bottlenecks
  - [ ] Optimize if needed

### Phase 6: Deployment (PRODUCTION)

- [ ] Environment setup

  - [ ] Configure production .env
  - [ ] Setup Redis cluster
  - [ ] Setup Cloud Storage bucket
  - [ ] Configure CORS

- [ ] Deploy backend

  - [ ] Build Docker image
  - [ ] Deploy to cloud (GCP, AWS, etc.)
  - [ ] Configure load balancer (WebSocket support)
  - [ ] Setup SSL certificate

- [ ] Deploy frontend

  - [ ] Update WebSocket endpoint
  - [ ] Test production connection
  - [ ] Monitor errors

- [ ] Monitoring & Alerts
  - [ ] Setup logging (Stackdriver, CloudWatch)
  - [ ] Setup alerts (errors, high latency)
  - [ ] Dashboard for metrics

---

## 🧪 Testing Checklist

### Unit Tests (Optional)

- [ ] Test KaiwaService

  - [ ] startConversation
  - [ ] forwardAudioToGemini
  - [ ] endConversation
  - [ ] handleAIAudioChunk

- [ ] Test KaiwaProcessor

  - [ ] handleSaveConversation
  - [ ] stitchAudioChunks

- [ ] Test Mock Services
  - [ ] GeminiGrpcClientService
  - [ ] CloudStorageService
  - [ ] SpeechToTextService

### Integration Tests

- [ ] Test WebSocket flow end-to-end
- [ ] Test Bull job processing
- [ ] Test database saves
- [ ] Test error scenarios
  - [ ] Invalid userId
  - [ ] Disconnection during streaming
  - [ ] Storage upload failure
  - [ ] Transcription failure

### Load Tests

- [ ] 10 concurrent users
- [ ] 50 concurrent users
- [ ] 100 concurrent users
- [ ] Measure: latency, CPU, memory, Redis

---

## 📊 Production Readiness Checklist

### Security ✓

- [ ] JWT authentication enabled
- [ ] Rate limiting configured
- [ ] Input validation
- [ ] Signed URLs for audio files
- [ ] HTTPS/WSS enabled

### Performance ✓

- [ ] Audio streaming optimized
- [ ] Bull workers scaled
- [ ] Redis configured properly
- [ ] CDN for audio files (optional)

### Reliability ✓

- [ ] Error handling comprehensive
- [ ] Retry mechanism for jobs
- [ ] Graceful shutdown
- [ ] Health checks

### Monitoring ✓

- [ ] Logging configured
- [ ] Metrics dashboard
- [ ] Alerts configured
- [ ] Error tracking (Sentry)

### Documentation ✓

- [x] API documentation (README.md)
- [x] Deployment guide (MIGRATION_GUIDE.md)
- [ ] Frontend integration guide
- [ ] Troubleshooting guide

---

## 🚨 Known Issues / TODO

### Current Limitations (Mock Implementation)

1. **Gemini gRPC**: Using mock stream, not real AI
2. **Cloud Storage**: Returning fake URLs
3. **Speech-to-Text**: Returning fake transcripts
4. **Audio Stitching**: Simple buffer concat, not proper merging
5. **Authentication**: Basic userId from handshake, no JWT

### Future Enhancements

- [ ] Support multiple audio formats (MP3, WAV, etc.)
- [ ] Real-time transcription display
- [ ] Conversation history UI
- [ ] Export conversation as text
- [ ] AI personality customization
- [ ] Multi-language support (not just Japanese)
- [ ] Conversation resume (reconnect to existing conversation)
- [ ] Audio quality adjustment

---

## 💡 Quick Commands

```bash
# Development
npm run dev

# Test WebSocket
npx ts-node src/modules/kaiwa/test-client.example.ts

# Check Prisma schema
npx prisma studio

# Check Redis (if local)
redis-cli KEYS "bull:kaiwa-processor:*"

# Check Bull jobs
redis-cli LRANGE "bull:kaiwa-processor:waiting" 0 -1

# Logs
tail -f logs/app.log  # if you have file logging

# Database query
npx prisma studio  # or
psql -d your_db -c "SELECT * FROM \"Kaiwa_ai\" ORDER BY \"createdAt\" DESC LIMIT 10;"
```

---

## 📞 Support

If you encounter issues:

1. **Connection issues**: Check `kaiwa.gateway.ts` logs
2. **Streaming issues**: Check `kaiwa.service.ts` logs
3. **Job processing issues**: Check `kaiwa.processor.ts` logs
4. **Database issues**: Check Prisma logs

Common issues:

- Redis not running → `redis-server`
- Wrong userId format → check handshake.auth
- Bull job stuck → restart Redis

---

**Last Updated**: 2025-11-05  
**Status**: Development Complete ✅  
**Next Step**: Local Testing 🧪
