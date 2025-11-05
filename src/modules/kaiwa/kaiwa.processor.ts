import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '@/shared/services/prisma.service';
import { CloudStorageService } from './services/cloud-storage.service';
import { SpeechToTextService } from './services/speech-to-text.service';

interface SaveConversationJobData {
    userId: number;
    conversationId: string;
    messages: Array<{ role: 'USER' | 'AI'; chunk: Buffer }>;
    model: string;
}

interface ProcessedMessage {
    role: 'USER' | 'AI';
    fullAudio: Buffer;
}

/**
 * KaiwaProcessor - Async worker for saving conversations
 * Handles audio upload, transcription, and database storage
 */
@Processor('kaiwa-processor')
@Injectable()
export class KaiwaProcessor {
    private readonly logger = new Logger(KaiwaProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly storageService: CloudStorageService,
        private readonly speechToTextService: SpeechToTextService
    ) { }

    /**
     * Process save-conversation job
     * 1. Stitch audio chunks together
     * 2. Upload to cloud storage
     * 3. Generate transcripts
     * 4. Save to database
     */
    @Process('save-conversation')
    async handleSaveConversation(job: Job<SaveConversationJobData>): Promise<void> {
        const { userId, conversationId, messages, model } = job.data;

        this.logger.log(
            `Processing save-conversation job for conversationId: ${conversationId}, userId: ${userId}`
        );

        try {
            // Step 1: Stitch audio chunks into complete audio files
            const processedMessages = await this.stitchAudioChunks(messages);

            if (processedMessages.length === 0) {
                this.logger.warn(`No processed messages for conversation ${conversationId}`);
                return;
            }

            // Step 2: Process each message (upload + transcribe)
            const recordsToCreate: Array<{
                userId: number;
                conversationId: string;
                role: string;
                audioUrl: string;
                transcript: string;
                model: string;
                createdAt: Date;
                updatedAt: Date;
            }> = [];

            await Promise.all(
                processedMessages.map(async (msg, index) => {
                    try {
                        // Upload audio to cloud storage
                        const audioPath = `kaiwa/${userId}/${conversationId}/${msg.role}_${index}_${Date.now()}.webm`;
                        const audioUrl = await this.storageService.upload(msg.fullAudio, audioPath);

                        // Generate transcript
                        const transcript = await this.speechToTextService.transcript(msg.fullAudio);

                        // Prepare record for database
                        recordsToCreate.push({
                            userId,
                            conversationId,
                            role: msg.role,
                            audioUrl,
                            transcript,
                            model,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });

                        this.logger.log(
                            `Processed ${msg.role} message ${index + 1}/${processedMessages.length} for ${conversationId}`
                        );
                    } catch (error) {
                        this.logger.error(
                            `Error processing message ${index} for ${conversationId}: ${error.message}`,
                            error.stack
                        );
                        // Continue processing other messages even if one fails
                    }
                })
            );

            // Step 3: Bulk insert into database
            if (recordsToCreate.length > 0) {
                await (this.prisma as any).kaiwa_ai.createMany({
                    data: recordsToCreate
                });

                this.logger.log(
                    `Successfully saved ${recordsToCreate.length} messages for conversation ${conversationId}`
                );
            } else {
                this.logger.warn(`No records to save for conversation ${conversationId}`);
            }
        } catch (error) {
            this.logger.error(
                `Failed to process save-conversation job for ${conversationId}: ${error.message}`,
                error.stack
            );
            throw error; // Re-throw to trigger Bull retry mechanism
        }
    }

    /**
     * Stitch consecutive audio chunks from the same role into complete audio files
     * Groups chunks by role to create coherent audio segments
     */
    private async stitchAudioChunks(
        messages: Array<{ role: 'USER' | 'AI'; chunk: Buffer }>
    ): Promise<ProcessedMessage[]> {
        // TODO: Implement audio stitching logic
        // This is a placeholder implementation
        // In production, you would:
        // 1. Group consecutive chunks by role
        // 2. Concatenate audio buffers properly (considering audio format/codec)
        // 3. Handle audio encoding/decoding if needed

        const processed: ProcessedMessage[] = [];
        let currentRole: 'USER' | 'AI' | null = null;
        let currentChunks: Buffer[] = [];

        for (const message of messages) {
            if (message.role !== currentRole) {
                // Save previous group if exists
                if (currentRole && currentChunks.length > 0) {
                    processed.push({
                        role: currentRole,
                        fullAudio: Buffer.concat(currentChunks)
                    });
                }

                // Start new group
                currentRole = message.role;
                currentChunks = [message.chunk];
            } else {
                // Same role, add to current group
                currentChunks.push(message.chunk);
            }
        }

        // Don't forget the last group
        if (currentRole && currentChunks.length > 0) {
            processed.push({
                role: currentRole,
                fullAudio: Buffer.concat(currentChunks)
            });
        }

        this.logger.log(
            `Stitched ${messages.length} chunks into ${processed.length} complete audio segments`
        );

        return processed;
    }
}

