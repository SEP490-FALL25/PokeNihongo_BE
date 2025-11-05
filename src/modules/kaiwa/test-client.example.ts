/**
 * Example WebSocket Client for Kaiwa Module
 * 
 * This file demonstrates how to connect and interact with the Kaiwa WebSocket server
 * Use this as a reference for implementing the frontend client
 * 
 * Usage:
 *   ts-node src/modules/kaiwa/test-client.example.ts
 */

import { io, Socket } from 'socket.io-client';

class KaiwaTestClient {
    private socket: Socket;
    private conversationId: string | null = null;

    constructor(private userId: number) {
        // Connect to Kaiwa WebSocket namespace
        this.socket = io('ws://localhost:3000/kaiwa', {
            auth: {
                userId: this.userId
            },
            transports: ['websocket']
        });

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Connection successful
        this.socket.on('connected', (data: { conversationId: string; message: string }) => {
            console.log('✅ Connected to Kaiwa AI');
            console.log('📝 Conversation ID:', data.conversationId);
            console.log('💬 Message:', data.message);
            this.conversationId = data.conversationId;

            // Start sending test audio after connection
            this.sendTestAudio();
        });

        // Receive AI audio chunks
        this.socket.on('ai-audio-chunk', (audioBuffer: Buffer) => {
            console.log('🤖 Received AI audio chunk:', audioBuffer.length, 'bytes');
            // TODO: Play audio using Web Audio API or similar
        });

        // Handle errors
        this.socket.on('error', (error: { message: string }) => {
            console.error('❌ Error:', error.message);
        });

        // Connection error
        this.socket.on('connect_error', (error: Error) => {
            console.error('❌ Connection error:', error.message);
        });

        // Disconnection
        this.socket.on('disconnect', (reason: string) => {
            console.log('🔌 Disconnected:', reason);
        });
    }

    /**
     * Send user audio chunk to server
     * In production, this would come from microphone input
     */
    public sendAudioChunk(audioBuffer: Buffer): void {
        if (!this.socket.connected) {
            console.error('❌ Socket not connected');
            return;
        }

        this.socket.emit('user-audio-chunk', audioBuffer);
        console.log('🎤 Sent user audio chunk:', audioBuffer.length, 'bytes');
    }

    /**
     * Send test audio for demonstration
     */
    private sendTestAudio(): void {
        console.log('\n📤 Sending test audio chunks...\n');

        // Simulate sending audio chunks every 500ms
        let count = 0;
        const interval = setInterval(() => {
            if (count >= 5) {
                clearInterval(interval);
                console.log('\n✅ Finished sending test audio chunks\n');

                // Disconnect after 10 seconds to trigger save-conversation job
                setTimeout(() => {
                    console.log('👋 Disconnecting to test save-conversation job...');
                    this.disconnect();
                }, 5000);

                return;
            }

            // Generate fake audio data
            const fakeAudioData = Buffer.from(`FAKE_AUDIO_CHUNK_${count}_${Date.now()}`);
            this.sendAudioChunk(fakeAudioData);
            count++;
        }, 500);
    }

    /**
     * Disconnect from server
     */
    public disconnect(): void {
        this.socket.disconnect();
        console.log('🔌 Disconnected from server');
    }

    /**
     * Get connection status
     */
    public isConnected(): boolean {
        return this.socket.connected;
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

if (require.main === module) {
    console.log('🚀 Starting Kaiwa Test Client...\n');

    // Create test client with userId = 1
    const client = new KaiwaTestClient(1);

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        console.log('\n\n⚠️  Caught interrupt signal, disconnecting...');
        client.disconnect();
        process.exit(0);
    });
}

// ============================================================================
// EXAMPLE: Frontend Integration (React/Vue)
// ============================================================================

/*
// Example React Hook for Kaiwa

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export function useKaiwa(userId: number) {
  const socketRef = useRef<Socket | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Connect to Kaiwa
    socketRef.current = io('ws://localhost:3000/kaiwa', {
      auth: { userId },
      transports: ['websocket']
    });

    const socket = socketRef.current;

    socket.on('connected', (data) => {
      setConversationId(data.conversationId);
      setIsConnected(true);
    });

    socket.on('ai-audio-chunk', (audioBuffer) => {
      // Play audio using Web Audio API
      playAudio(audioBuffer);
    });

    socket.on('error', (error) => {
      console.error('Kaiwa error:', error);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, [userId]);

  const sendAudioChunk = (audioBuffer: Buffer) => {
    socketRef.current?.emit('user-audio-chunk', audioBuffer);
  };

  return {
    conversationId,
    isConnected,
    sendAudioChunk
  };
}

// Usage in component:
function KaiwaChat() {
  const { conversationId, sendAudioChunk } = useKaiwa(userId);
  
  // Setup microphone and send audio
  // ...
}
*/

export { KaiwaTestClient };

