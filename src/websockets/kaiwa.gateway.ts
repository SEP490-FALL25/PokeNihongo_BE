// import { KAIWA_EVENTS, SOCKET_ROOM } from '@/common/constants/socket.constant'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
    ConnectedSocket,
    MessageBody,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets'
import { Queue } from 'bull'
import { Server, Socket } from 'socket.io'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { SpeechToTextService } from '@/3rdService/speech/speech-to-text.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'

/**
 * KaiwaGateway - WebSocket Gateway for real-time audio conversation
 * Handles audio input -> Speech-to-Text -> Gemini 2.5 Pro -> Text-to-Speech -> Audio output
 */
@WebSocketGateway({
    namespace: '/kaiwa'
})
@Injectable()
export class KaiwaGateway {
    @WebSocketServer()
    server: Server

    private readonly logger = new Logger(KaiwaGateway.name)
    private genAI: GoogleGenerativeAI | null = null

    constructor(
        @InjectQueue('kaiwa-processor') private readonly kaiwaQueue: Queue,
        private readonly configService: ConfigService,
        private readonly speechToTextService: SpeechToTextService,
        private readonly textToSpeechService: TextToSpeechService
    ) {
        // Initialize Gemini API với API Key
        this.initializeGeminiAPI()
    }

    /**
     * Initialize Gemini API với API Key
     */
    private initializeGeminiAPI() {
        const apiKey = process.env.GEMINI_API_KEY

        if (!apiKey || apiKey.trim() === '') {
            this.logger.warn('[Kaiwa] GEMINI_API_KEY not found. Gemini API will not work.')
            this.logger.warn('[Kaiwa] Please set GEMINI_API_KEY in .env')
            return
        }

        try {
            this.genAI = new GoogleGenerativeAI(apiKey)
            this.logger.log('[Kaiwa] Gemini API initialized with API Key')
        } catch (error) {
            this.logger.error(`[Kaiwa] Failed to initialize Gemini API: ${error.message}`)
        }
    }

    /**
     * Handle incoming audio chunks from user
     * Flow: Audio -> Speech-to-Text -> Gemini 2.5 Pro -> Text-to-Speech -> Audio Response
     */
    @SubscribeMessage('user-audio-chunk')
    async handleUserAudioChunk(
        @ConnectedSocket() client: Socket,
        @MessageBody() payload: any
    ): Promise<void> {
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        this.logger.log(`[Kaiwa] [${requestId}] Starting audio processing`)

        try {
            const userId = client.data?.userId

            if (!userId) {
                this.logger.warn(`[Kaiwa] [${requestId}] No userId found for client ${client.id}`)
                client.emit('error', { message: 'Missing userId' })
                return
            }

            // Tạo conversationId nếu chưa có
            if (!client.data.conversationId) {
                client.data.conversationId = `conv_${userId}_${Date.now()}`
                this.logger.log(`[Kaiwa] [${requestId}] Created conversationId: ${client.data.conversationId} for user ${userId}`)
            }

            // Kiểm tra xem có request khác đang xử lý không (đơn giản - chỉ log warning)
            if (client.data.processingAudio) {
                this.logger.warn(`[Kaiwa] [${requestId}] Previous audio request still processing, queuing this one`)
            }
            client.data.processingAudio = true

            // Kiểm tra Gemini API
            if (!this.genAI) {
                client.emit('error', {
                    message: 'Gemini API not initialized',
                    suggestion: 'Please set GEMINI_API_KEY in .env file'
                })
                return
            }

            // Xử lý payload - convert sang Buffer
            let audioBuffer: Buffer
            if (Buffer.isBuffer(payload)) {
                audioBuffer = payload
            } else if (payload instanceof Uint8Array) {
                audioBuffer = Buffer.from(payload)
            } else if (payload && typeof payload === 'object' && payload.audio) {
                // Nếu là object có field audio
                if (payload.audio instanceof Uint8Array) {
                    audioBuffer = Buffer.from(payload.audio)
                } else if (Buffer.isBuffer(payload.audio)) {
                    audioBuffer = payload.audio
                } else {
                    throw new Error('Invalid audio format: must be Uint8Array or Buffer')
                }
            } else if (typeof payload === 'string') {
                // Nếu là base64 string
                audioBuffer = Buffer.from(payload, 'base64')
            } else {
                throw new Error(`Invalid payload type: expected Buffer, Uint8Array, or object with audio field, got ${typeof payload}`)
            }

            this.logger.log(`[Kaiwa] [${requestId}] Received audio chunk: ${audioBuffer.length} bytes from user ${userId}, conversationId: ${client.data.conversationId}`)

            // Emit processing status
            client.emit('processing', {
                conversationId: client.data.conversationId,
                status: 'speech-to-text',
                message: 'Đang chuyển đổi âm thanh thành văn bản...'
            })

            // Step 1: Speech-to-Text (Audio -> Text) với timeout
            let transcription: string
            try {
                // Thêm timeout để tránh đợi quá lâu (10 giây)
                const speechPromise = this.speechToTextService.convertAudioToText(audioBuffer, {
                    languageCode: 'ja-JP',
                    enableAutomaticPunctuation: true,
                    sampleRateHertz: 16000,
                    encoding: 'LINEAR16'
                })

                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('Speech-to-Text timeout sau 10 giây')), 10000)
                })

                const speechResult = await Promise.race([speechPromise, timeoutPromise])
                transcription = speechResult.transcript
                this.logger.log(`[Kaiwa] [${requestId}] Speech-to-Text: "${transcription}" (confidence: ${speechResult.confidence})`)

                if (!transcription || transcription.trim() === '') {
                    this.logger.warn(`[Kaiwa] Speech-to-Text returned empty transcript`)
                    client.emit('error', {
                        message: 'Không thể nhận diện giọng nói. Vui lòng thử lại.',
                        suggestion: 'Hãy nói rõ ràng hơn hoặc kiểm tra microphone'
                    })
                    return
                }
            } catch (speechError) {
                this.logger.error(`[Kaiwa] Speech-to-Text error: ${speechError.message}`, speechError.stack)
                client.emit('error', {
                    message: `Lỗi chuyển đổi âm thanh: ${speechError.message}`,
                    suggestion: 'Vui lòng kiểm tra microphone và thử lại'
                })
                return
            }

            // Emit transcription ngay lập tức
            client.emit('transcription', {
                conversationId: client.data.conversationId,
                text: transcription,
                timestamp: Date.now()
            })

            // Lấy conversation history
            let conversationHistory = client.data.conversationHistory || []

            // Step 2: Gửi text đến Gemini Flash (chạy song song với các task khác nếu có thể)
            // Build prompt cho kaiwa (đàm thoại tiếng Nhật)
            const systemPrompt = `Bạn là một giáo viên tiếng Nhật thân thiện. QUAN TRỌNG: Bạn CHỈ được trả lời bằng tiếng Nhật, KHÔNG được dùng tiếng Việt hay bất kỳ ngôn ngữ nào khác. Hãy trả lời bằng tiếng Nhật một cách tự nhiên và dễ hiểu. Hãy giúp người học luyện tập hội thoại tiếng Nhật.`

            // Build full prompt với conversation history
            let fullPrompt = systemPrompt + '\n\n'
            conversationHistory.forEach((msg: any) => {
                if (msg.role === 'user') {
                    fullPrompt += `Người học: ${msg.text}\n`
                } else if (msg.role === 'model') {
                    fullPrompt += `Bạn: ${msg.text}\n`
                }
            })
            fullPrompt += `Người học: ${transcription}\nBạn:`

            // Emit processing status
            client.emit('processing', {
                conversationId: client.data.conversationId,
                status: 'gemini-processing',
                message: 'Đang xử lý với AI...'
            })

            // Tạo tất cả promises để chạy song song
            const geminiPromise = (async () => {
                if (!this.genAI) {
                    throw new Error('Gemini API not initialized')
                }
                const model = this.genAI.getGenerativeModel({
                    model: 'gemini-2.5-flash',
                    generationConfig: {
                        temperature: 0.7,
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 1024
                    }
                })
                const result = await model.generateContent(fullPrompt)
                const response = await result.response
                const text = response.text()

                // Log full response để debug
                this.logger.debug(`[Kaiwa] Gemini raw response: "${text}"`)
                this.logger.debug(`[Kaiwa] Gemini response length: ${text?.length || 0}`)

                if (!text || text.trim() === '') {
                    this.logger.error(`[Kaiwa] Gemini returned empty or whitespace-only response`)
                    throw new Error('Gemini returned empty response')
                }

                // Kiểm tra nếu response chỉ là "..." hoặc quá ngắn
                const trimmedText = text.trim()
                if (trimmedText === '...' || trimmedText.length < 2) {
                    this.logger.error(`[Kaiwa] Gemini returned invalid response: "${trimmedText}"`)
                    throw new Error(`Gemini returned invalid response: "${trimmedText}"`)
                }

                return trimmedText
            })()

            // Chờ Gemini response với timeout (15 giây)
            let geminiResponse: string
            try {
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('Gemini API timeout sau 15 giây')), 15000)
                })

                geminiResponse = await Promise.race([geminiPromise, timeoutPromise])
                this.logger.log(`[Kaiwa] [${requestId}] Gemini response: "${geminiResponse.substring(0, 100)}..." (length: ${geminiResponse.length})`)

                if (!geminiResponse || geminiResponse.trim() === '') {
                    this.logger.error(`[Kaiwa] [${requestId}] Gemini returned empty response`)
                    throw new Error('Gemini returned empty response')
                }

                // Kiểm tra lại sau khi đã log
                if (geminiResponse.trim() === '...' || geminiResponse.trim().length < 2) {
                    this.logger.error(`[Kaiwa] [${requestId}] Gemini returned invalid response: "${geminiResponse.trim()}"`)
                    throw new Error(`Gemini returned invalid response: "${geminiResponse.trim()}"`)
                }

                // Lưu conversation history
                conversationHistory.push(
                    { role: 'user', text: transcription },
                    { role: 'model', text: geminiResponse }
                )
                if (conversationHistory.length > 10) {
                    conversationHistory.shift()
                    conversationHistory.shift()
                }
                client.data.conversationHistory = conversationHistory
            } catch (geminiError) {
                this.logger.error(`[Kaiwa] [${requestId}] Gemini API error: ${geminiError.message}`, geminiError.stack)
                client.data.processingAudio = false
                client.emit('error', {
                    message: `Lỗi AI: ${geminiError.message}`,
                    suggestion: 'Vui lòng kiểm tra GEMINI_API_KEY và thử lại'
                })
                return
            }

            // Emit text response ngay lập tức (chỉ có Japanese)
            client.emit('text-response', {
                conversationId: client.data.conversationId,
                text: geminiResponse,
                translation: '',
                timestamp: Date.now()
            })

            // Step 3 & 4: Translation và TTS chạy song song HOÀN TOÀN và emit ngay khi có (streaming)
            // Không đợi Promise.all() - mỗi task tự emit khi xong
            const genAIInstance = this.genAI // Capture để tránh null check
            if (genAIInstance) {
                // Translation - emit ngay khi có
                (async () => {
                    try {
                        const translatePrompt = `Hãy dịch câu tiếng Nhật sau sang tiếng Việt một cách tự nhiên và chính xác:\n\n${geminiResponse}\n\nChỉ trả lời bằng bản dịch tiếng Việt, không thêm gì khác.`
                        const translateModel = genAIInstance.getGenerativeModel({
                            model: 'gemini-2.5-flash',
                            generationConfig: {
                                temperature: 0.3,
                                topP: 0.95,
                                topK: 40,
                                maxOutputTokens: 512
                            }
                        })
                        const translateResult = await translateModel.generateContent(translatePrompt)
                        const translateResponse = await translateResult.response
                        const translation = translateResponse.text().trim()

                        this.logger.log(`[Kaiwa] [${requestId}] Vietnamese translation: "${translation.substring(0, 100)}..."`)
                        client.emit('text-response-update', {
                            conversationId: client.data.conversationId,
                            translation: translation
                        })
                    } catch (translateError) {
                        this.logger.warn(`[Kaiwa] [${requestId}] Translation error: ${translateError.message}`)
                    }
                })().catch(err => {
                    this.logger.error(`[Kaiwa] [${requestId}] Translation promise error: ${err.message}`, err.stack)
                })
            }

            // TTS - emit ngay khi có (chỉ nếu có text hợp lệ)
            if (geminiResponse && geminiResponse.trim().length > 0) {
                (async () => {
                    try {
                        this.logger.log(`[Kaiwa] [${requestId}] Starting TTS for text: "${geminiResponse.substring(0, 50)}..." (length: ${geminiResponse.length})`)
                        const result = await this.textToSpeechService.convertTextToSpeech(geminiResponse, {
                            languageCode: 'ja-JP',
                            voiceName: 'ja-JP-Wavenet-A',
                            audioEncoding: 'MP3',
                            speakingRate: 1.0,
                            pitch: 0.0
                        })

                        if (!result || !result.audioContent || result.audioContent.length === 0) {
                            this.logger.error(`[Kaiwa] [${requestId}] TTS returned empty audio content`)
                            client.emit('error', {
                                message: 'Không thể tạo audio response',
                                suggestion: 'Text response đã được gửi, nhưng audio không khả dụng'
                            })
                            client.data.processingAudio = false
                            return
                        }

                        const audioBase64 = result.audioContent.toString('base64')
                        this.logger.log(`[Kaiwa] [${requestId}] Text-to-Speech completed: ${result.audioContent.length} bytes`)
                        client.emit('audio-response', {
                            conversationId: client.data.conversationId,
                            audio: audioBase64,
                            audioFormat: 'mp3',
                            text: geminiResponse,
                            timestamp: Date.now()
                        })
                        client.data.processingAudio = false
                        this.logger.log(`[Kaiwa] [${requestId}] Audio processing completed successfully`)
                    } catch (ttsError) {
                        this.logger.error(`[Kaiwa] [${requestId}] Text-to-Speech error: ${ttsError.message}`, ttsError.stack)
                        client.data.processingAudio = false
                        client.emit('error', {
                            message: 'Không thể tạo audio response',
                            suggestion: 'Text response đã được gửi, nhưng audio không khả dụng'
                        })
                    }
                })().catch(err => {
                    this.logger.error(`[Kaiwa] [${requestId}] TTS promise error: ${err.message}`, err.stack)
                    client.data.processingAudio = false
                })
            } else {
                this.logger.error(`[Kaiwa] [${requestId}] Skipping TTS - geminiResponse is empty or invalid: "${geminiResponse}"`)
                client.data.processingAudio = false
            }
        } catch (error) {
            this.logger.error(`[Kaiwa] [${requestId || 'unknown'}] Error handling user audio chunk: ${error.message}`, error.stack)
            if (client.data) {
                client.data.processingAudio = false
            }
            client.emit('error', { message: `Failed to process audio: ${error.message}` })
        }
    }

    /**
     * Join kaiwa room
     */
    @SubscribeMessage('join')
    handleJoinSearchingRoom(@ConnectedSocket() client: Socket): void {
        const userId = client.data?.userId

        if (!userId) {
            this.logger.warn(
                `[KaiwaGateway] Client ${client.id} missing userId in socket.data; unauthorized`
            )
            client.emit('error', { message: 'Missing userId' })
            return
        }

        // Initialize conversationId và conversation history
        if (!client.data.conversationId) {
            client.data.conversationId = `conv_${userId}_${Date.now()}`
        }
        if (!client.data.conversationHistory) {
            client.data.conversationHistory = []
        }

        const roomName = `kaiwa_${userId}`
        client.join(roomName)

        this.logger.log(`[Kaiwa] User ${userId} joined room ${roomName}, conversationId: ${client.data.conversationId}`)

        // Emit joined event
        client.emit('joined', {
            conversationId: client.data.conversationId,
            roomName,
            userId
        })

        // Cleanup on disconnect
        client.on('disconnect', () => {
            try {
                this.logger.log(`[Kaiwa] Client ${client.id} disconnected, cleaning up`)
                if (client.data) {
                    client.data.conversationId = undefined
                    client.data.conversationHistory = undefined
                }
            } catch (err) {
                this.logger.error(`[Kaiwa] Error during disconnect cleanup: ${err.message}`)
            }
        })
    }
}
