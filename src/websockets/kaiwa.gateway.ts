import { KAIWA_EVENTS, SOCKET_ROOM } from '@/common/constants/socket.constant'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { Queue } from 'bull'
import { Server, Socket } from 'socket.io'
import { KaiwaService } from '../modules/kaiwa/kaiwa.service'

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

  constructor(
    private readonly kaiwaService: KaiwaService,
    @InjectQueue('kaiwa-processor') private readonly kaiwaQueue: Queue
  ) {}

  /**
   * Handle incoming audio chunks from user
   * Forward to Gemini AI in real-time
   */
  // Nhận audio chunk từ client
  //FE emit event 'user-audio-chunk' với payload là Buffer audio chunk
  @SubscribeMessage(KAIWA_EVENTS.USER_AUDIO_CHUNK)
  async handleUserAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: Buffer
  ): Promise<void> {
    try {
      const { conversationId, userId } = client.data

      const roomName = SOCKET_ROOM.getKaiwaRoomByUserId(userId)

      if (!conversationId) {
        this.logger.warn(`No conversationId found for client ${client.id}`)
        return
      }

      // tu user gui xuong
      // dung queue o day
      //nhan payload
      //gọi service forwardAudioToGemini

      // đợi nhân đc forwardAudioToGemini
      //nhan ve

      // Forward audio chunk to Gemini AI
      const data = await this.kaiwaService.forwardAudioToGemini(conversationId, payload)
      // goi queue de xu ly

      // emit lại cho client
      //todo chỗ payload đổi lại thành data của gemini trả về
      this.server.to(roomName).emit(KAIWA_EVENTS.USER_AUDIO_RESPONSE, data)
    } catch (error) {
      this.logger.error(`Error handling user audio chunk: ${error.message}`, error.stack)
      client.emit('error', { message: 'Failed to process audio' })
    }
  }

  // Tina sẽ emit sự kiện để join room kaiwa_{userId}
  @SubscribeMessage(KAIWA_EVENTS.JOIN)
  handleJoinSearchingRoom(@ConnectedSocket() client: Socket): void {
    const userId = client.data?.userId

    if (!userId) {
      this.logger.warn(
        `[KaiwaGateway] Client ${client.id} missing userId in socket.data; unauthorized`
      )
      return
    }

    // ép thằng user vào room theo form kaiwa_{userId}

    const roomName = SOCKET_ROOM.getKaiwaRoomByUserId(userId)
    client.join(roomName)

    this.logger.debug(
      `[KaiwaGateway] Client ${client.id} joined room ${roomName} for user ${userId}`
    )
  }
}
