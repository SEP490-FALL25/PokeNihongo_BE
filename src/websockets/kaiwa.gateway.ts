// import { KAIWA_EVENTS, SOCKET_ROOM } from '@/common/constants/socket.constant'
import { Injectable, Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import WSImpl from 'ws'
// import { KaiwaService } from '../modules/kaiwa/kaiwa.service'

/**
 * KaiwaGateway - WebSocket Gateway for real-time audio streaming
 * Handles bidirectional audio communication between client and Gemini AI
 */
@WebSocketGateway({
  namespace: '/kaiwa'
})
@Injectable()
export class KaiwaGateway {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(KaiwaGateway.name)

  constructor() {} // @InjectQueue('kaiwa-processor') private readonly kaiwaQueue: Queue // private readonly kaiwaService: KaiwaService,

  private createGeminiRealtimeWS(apiKey: string, model: string) {
    const url = `wss://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${encodeURIComponent(apiKey)}`
    this.logger.log(`[KaiwaGateway] Creating Gemini Realtime WS connection to ${url}`)
    if (!WSImpl) throw new Error('WebSocket implementation not available on server')
    return new WSImpl(url, { perMessageDeflate: false })
  }

  /**
   * Handle incoming audio chunks from user
   * Forward to Gemini AI in real-time
   */
  // Nhận audio chunk từ client
  //FE emit event 'user-audio-chunk' với payload là Buffer audio chunk
  @SubscribeMessage('user-audio-chunk')
  async handleUserAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; audio: Buffer }
  ): Promise<void> {
    try {
      const { userId } = client.data
      const conversationId = payload.conversationId
      console.log('vovovoovovovovovovoovovovov')

      // const roomName = SOCKET_ROOM.getKaiwaRoomByUserId(userId)

      if (!conversationId) {
        this.logger.warn(`No conversationId found for client ${client.id}`)
        return
      }

      let upstream: any | undefined = client.data?.geminiRealtime as any | undefined
      if (!upstream || upstream.readyState !== (WSImpl?.OPEN ?? 1)) {
        const apiKey = process.env.GEMINI_FLASH_API_KEY || process.env.GEMINI_API_KEY
        if (!apiKey) {
          this.logger.error(
            'Missing GEMINI_API_KEY/GEMINI_FLASH_API_KEY for Realtime API'
          )
          client.emit('error', { message: 'Server missing Gemini API key' })
          return
        }
        upstream = this.createGeminiRealtimeWS(
          apiKey,
          'gemini-2.5-flash-native-audio-dialog'
        )
        client.data.geminiRealtime = upstream

        upstream.on('open', () => {
          this.logger.log(`[Kaiwa] Realtime WS open for user ${userId}`)
        })
        upstream.on('message', (raw: any) => {
          try {
            const msg = JSON.parse(raw.toString())
            // Relay model outputs to client (or room)
            client.emit('user-audio-response', msg)
            // this.server.to(roomName).emit('user-audio-response', msg)
          } catch {
            client.emit('user-audio-response', raw)
          }
        })
        upstream.on('close', (code, reason) => {
          this.logger.warn(
            `[Kaiwa] Realtime WS closed (${code}) for user ${userId}: ${reason}`
          )
          if (client.data) client.data.geminiRealtime = undefined
        })
        upstream.on('error', (err) => {
          this.logger.error(
            `[Kaiwa] Realtime WS error for user ${userId}: ${err.message}`
          )
          client.emit('error', { message: 'Gemini Realtime connection error' })
        })
      }

      const frame = {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/pcm',
                  data: Buffer.isBuffer(payload)
                    ? payload.toString('base64')
                    : Buffer.from(payload as any).toString('base64')
                }
              }
            ]
          }
        ]
      }
      if (upstream.readyState === (WSImpl?.OPEN ?? 1)) {
        upstream.send(JSON.stringify(frame))
      }
    } catch (error) {
      this.logger.error(`Error handling user audio chunk: ${error.message}`, error.stack)
      client.emit('error', { message: 'Failed to process audio' })
    }
  }

  // Tina sẽ emit sự kiện để join room kaiwa_{userId}
  @SubscribeMessage('join')
  handleJoinSearchingRoom(@ConnectedSocket() client: Socket): void {
    const userId = client.data?.userId

    if (!userId) {
      this.logger.warn(
        `[KaiwaGateway] Client ${client.id} missing userId in socket.data; unauthorized`
      )
      return
    }

    // ép thằng user vào room theo form kaiwa_{userId}

    // const roomName = SOCKET_ROOM.getKaiwaRoomByUserId(userId)
    // client.join(roomName)

    client.on('disconnect', () => {
      try {
        const upstream: any | undefined = client.data?.geminiRealtime
        if (upstream && upstream.readyState === (WSImpl?.OPEN ?? 1)) {
          upstream.close(1000, 'client disconnect')
        }
        if (client.data) client.data.geminiRealtime = undefined
      } catch {}
    })
  }
}
