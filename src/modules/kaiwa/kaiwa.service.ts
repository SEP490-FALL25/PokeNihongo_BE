import { Injectable, Logger } from '@nestjs/common';
import { Socket } from 'socket.io';
import { GeminiGrpcClientService } from './services/gemini-grpc-client.service';
import { GeminiConfigService } from '../gemini-config/gemini-config.service';
import { Duplex } from 'stream';

interface ConversationState {
    stream: Duplex; // gRPC bidirectional stream
    messages: Array<{ role: 'USER' | 'AI'; chunk: Buffer }>;
    client: Socket;
}

/**
 * KaiwaService - Manages conversation state and AI streaming
 * Keeps track of active conversations in memory
 */
@Injectable()
export class KaiwaService {
    private readonly logger = new Logger(KaiwaService.name);

    // In-memory map of active conversations
    private conversations = new Map<string, ConversationState>();

    constructor(
        private readonly geminiGrpcClient: GeminiGrpcClientService,
        private readonly geminiConfigService: GeminiConfigService
    ) { }

    /**
     * Start a new conversation with Gemini AI
     * Opens bidirectional gRPC stream and sets up event listeners
     */
    async startConversation(
        client: Socket,
        conversationId: string,
        userId: number
    ): Promise<void> {
        try {
            // Get AI Kaiwa prompt from config
            // TODO: Fetch actual prompt from GeminiConfigService based on AI_KAIWA type
            const prompt = await this.getKaiwaPrompt();

            // Open bidirectional gRPC stream
            const stream = await this.geminiGrpcClient.startBidirectionalStream(prompt);

            // Store conversation state
            this.conversations.set(conversationId, {
                stream,
                messages: [],
                client
            });

            // Listen to AI audio responses
            stream.on('data', (audioChunk: Buffer) => {
                this.handleAIAudioChunk(conversationId, audioChunk);
            });

            stream.on('error', (error: Error) => {
                this.logger.error(
                    `Stream error for conversation ${conversationId}: ${error.message}`,
                    error.stack
                );
                client.emit('error', { message: 'AI connection error' });
            });

            stream.on('end', () => {
                this.logger.log(`Stream ended for conversation ${conversationId}`);
            });

            this.logger.log(`Started conversation ${conversationId} for user ${userId}`);
        } catch (error) {
            this.logger.error(`Failed to start conversation: ${error.message}`, error.stack);
            throw error;
        }
    }

    /**
     * Forward user audio chunk to Gemini AI
     */
    async forwardAudioToGemini(conversationId: string, audioChunk: Buffer): Promise<void> {
        const conversation = this.conversations.get(conversationId);

        if (!conversation) {
            this.logger.warn(`Conversation ${conversationId} not found`);
            return;
        }

        try {
            // Store user audio chunk
            conversation.messages.push({
                role: 'USER',
                chunk: audioChunk
            });

            // Forward to gRPC stream
            conversation.stream.write(audioChunk);
        } catch (error) {
            this.logger.error(
                `Error forwarding audio for ${conversationId}: ${error.message}`,
                error.stack
            );
        }
    }

    /**
     * Handle AI audio chunk received from gRPC stream
     * Emit to client in real-time
     */
    private handleAIAudioChunk(conversationId: string, audioChunk: Buffer): void {
        const conversation = this.conversations.get(conversationId);

        if (!conversation) {
            this.logger.warn(`Conversation ${conversationId} not found for AI chunk`);
            return;
        }

        try {
            // Store AI audio chunk
            conversation.messages.push({
                role: 'AI',
                chunk: audioChunk
            });

            // Emit to client immediately (low-latency streaming)
            conversation.client.emit('ai-audio-chunk', audioChunk);
        } catch (error) {
            this.logger.error(
                `Error handling AI audio chunk for ${conversationId}: ${error.message}`,
                error.stack
            );
        }
    }

    /**
     * End conversation and clean up resources
     * Returns conversation data for saving
     */
    async endConversation(conversationId: string): Promise<ConversationState | null> {
        const conversation = this.conversations.get(conversationId);

        if (!conversation) {
            this.logger.warn(`Conversation ${conversationId} not found for ending`);
            return null;
        }

        try {
            // Close gRPC stream
            conversation.stream.end();

            // Remove from active conversations
            this.conversations.delete(conversationId);

            this.logger.log(`Ended conversation ${conversationId}`);

            return conversation;
        } catch (error) {
            this.logger.error(
                `Error ending conversation ${conversationId}: ${error.message}`,
                error.stack
            );
            return null;
        }
    }

    /**
     * Get Kaiwa prompt from config
     * TODO: Implement actual fetch from GeminiConfigService
     */
    private async getKaiwaPrompt(): Promise<string> {
        // TODO: Implement actual prompt retrieval
        // const config = await this.geminiConfigService.getDefaultConfigForService('AI_KAIWA');
        // return config?.prompt || DEFAULT_PROMPT;

        return `あなたは日本語の会話練習をサポートするAIアシスタントです。
自然な日本語で会話をリードし、学習者が実践的な会話スキルを向上できるようサポートしてください。`;
    }
}

