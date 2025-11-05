import { Injectable, Logger } from '@nestjs/common';
import { Duplex } from 'stream';
import { EventEmitter } from 'events';

/**
 * GeminiGrpcClientService - Mock service for Gemini gRPC bidirectional streaming
 * TODO: Implement actual gRPC connection using @google-cloud/speech or grpc-js
 */
@Injectable()
export class GeminiGrpcClientService {
    private readonly logger = new Logger(GeminiGrpcClientService.name);

    /**
     * Start bidirectional stream with Gemini AI
     * Returns a Duplex stream for sending/receiving audio
     *
     * TODO: Implement actual gRPC connection
     * - Use @grpc/grpc-js for gRPC client
     * - Connect to Gemini 2.5 Flash Native Audio Dialog endpoint
     * - Handle authentication with API key
     * - Implement proper error handling and reconnection logic
     */
    async startBidirectionalStream(prompt: string): Promise<Duplex> {
        this.logger.log(`Starting bidirectional stream with prompt: ${prompt.substring(0, 50)}...`);

        // TODO: Replace with actual gRPC implementation
        // Example:
        // const client = new GeminiAudioServiceClient(credentials);
        // const stream = client.bidirectionalStreamingAudio();
        // stream.write({ config: { prompt, model: 'gemini-2.5-flash-native-audio-dialog' } });
        // return stream;

        // Mock implementation: Create a fake Duplex stream
        const mockStream = new MockDuplexStream();

        // Simulate AI responses after a delay
        this.simulateAIResponses(mockStream);

        return mockStream as any;
    }

    /**
     * Simulate AI audio responses for testing
     * Remove this in production
     */
    private simulateAIResponses(stream: MockDuplexStream): void {
        // Simulate receiving AI audio chunks after 2 seconds
        setTimeout(() => {
            const mockAudioChunk = Buffer.from('MOCK_AI_AUDIO_DATA');
            stream.simulateIncomingData(mockAudioChunk);
        }, 2000);

        // Simulate another chunk after 4 seconds
        setTimeout(() => {
            const mockAudioChunk2 = Buffer.from('MOCK_AI_AUDIO_DATA_2');
            stream.simulateIncomingData(mockAudioChunk2);
        }, 4000);
    }
}

/**
 * Mock Duplex Stream for testing
 * Simulates bidirectional communication
 */
class MockDuplexStream extends EventEmitter {
    private chunks: Buffer[] = [];

    write(chunk: Buffer): boolean {
        // Simulate writing to gRPC stream
        this.chunks.push(chunk);
        console.log(`[MockStream] Received chunk of size ${chunk.length}`);
        return true;
    }

    end(): void {
        // Simulate closing stream
        console.log(`[MockStream] Stream ended`);
        this.emit('end');
    }

    // Simulate receiving data from AI
    simulateIncomingData(chunk: Buffer): void {
        this.emit('data', chunk);
    }

    on(event: string, listener: (...args: any[]) => void): this {
        return super.on(event, listener);
    }
}

