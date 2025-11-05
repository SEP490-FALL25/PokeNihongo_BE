import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket
} from '@nestjs/websockets';
import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { KaiwaService } from './kaiwa.service';

/**
 * KaiwaGateway - WebSocket Gateway for real-time audio streaming
 * Handles bidirectional audio communication between client and Gemini AI
 */
@WebSocketGateway({
    namespace: '/kaiwa',
    cors: {
        origin: '*',
        credentials: true
    }
})
@Injectable()
export class KaiwaGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(KaiwaGateway.name);

    constructor(
        private readonly kaiwaService: KaiwaService,
        @InjectQueue('kaiwa-processor') private readonly kaiwaQueue: Queue
    ) { }

    /**
     * Handle new WebSocket connection
     * - Authenticate user
     * - Create conversation ID
     * - Start conversation with AI
     */
    async handleConnection(client: Socket): Promise<void> {
        try {
            // Extract userId from handshake auth (adjust based on your auth strategy)
            const userId = client.handshake.auth?.userId || client.handshake.query?.userId;

            if (!userId) {
                this.logger.warn(`Connection rejected: No userId provided`);
                client.emit('error', { message: 'Authentication required' });
                client.disconnect();
                return;
            }

            // Generate unique conversation ID
            const conversationId = uuidv4();

            // Store metadata in socket
            client.data.userId = parseInt(userId as string);
            client.data.conversationId = conversationId;

            this.logger.log(
                `Client connected: ${client.id}, userId: ${userId}, conversationId: ${conversationId}`
            );

            // Start conversation and setup AI audio streaming
            await this.kaiwaService.startConversation(client, conversationId, client.data.userId);

            // Emit connection success
            client.emit('connected', {
                conversationId,
                message: 'Connected to Kaiwa AI'
            });
        } catch (error) {
            this.logger.error(`Connection error: ${error.message}`, error.stack);
            client.emit('error', { message: 'Failed to establish connection' });
            client.disconnect();
        }
    }

    /**
     * Handle incoming audio chunks from user
     * Forward to Gemini AI in real-time
     */
    @SubscribeMessage('user-audio-chunk')
    async handleUserAudioChunk(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: Buffer
    ): Promise<void> {
        try {
            const { conversationId, userId } = client.data;

            if (!conversationId) {
                this.logger.warn(`No conversationId found for client ${client.id}`);
                return;
            }

            // Forward audio chunk to Gemini AI
            await this.kaiwaService.forwardAudioToGemini(conversationId, payload);
        } catch (error) {
            this.logger.error(`Error handling user audio chunk: ${error.message}`, error.stack);
            client.emit('error', { message: 'Failed to process audio' });
        }
    }

    /**
     * Handle WebSocket disconnection
     * - End conversation
     * - Queue job for saving conversation to database
     */
    async handleDisconnect(client: Socket): Promise<void> {
        try {
            const { conversationId, userId } = client.data;

            if (!conversationId || !userId) {
                this.logger.warn(`Disconnect without conversation data: ${client.id}`);
                return;
            }

            this.logger.log(
                `Client disconnected: ${client.id}, conversationId: ${conversationId}`
            );

            // End conversation and get conversation data
            const conversationData = await this.kaiwaService.endConversation(conversationId);

            if (!conversationData || conversationData.messages.length === 0) {
                this.logger.warn(`No conversation data to save for ${conversationId}`);
                return;
            }

            // Queue job for async processing (upload + save to DB)
            await this.kaiwaQueue.add('save-conversation', {
                userId,
                conversationId,
                messages: conversationData.messages,
                model: 'gemini-2.5-flash-native-audio-dialog'
            });

            this.logger.log(`Queued save-conversation job for ${conversationId}`);
        } catch (error) {
            this.logger.error(`Disconnect error: ${error.message}`, error.stack);
        }
    }
}

