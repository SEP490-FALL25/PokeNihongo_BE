import { BullQueue } from '@/common/constants/bull-action.constant'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
    ConnectedSocket,
    MessageBody,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer
} from '@nestjs/websockets'
import { Queue } from 'bull'
import { Server, Socket } from 'socket.io'
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { SpeechToTextService } from '@/3rdService/speech/speech-to-text.service'
import { TextToSpeechService } from '@/3rdService/speech/text-to-speech.service'
import { KAIWA_EVENTS, SOCKET_ROOM } from '@/common/constants/socket.constant'
import { Error as ErrorMessage } from '@/common/constants/message'
import { UserAIConversationService } from '@/modules/user-ai-conversation/user-ai-conversation.service'
import { AIConversationRoomService } from '@/modules/ai-conversation-room/ai-conversation-room.service'
import { I18nService } from '@/i18n/i18n.service'
import { UploadService } from '@/3rdService/upload/upload.service'

/**
 * KaiwaGateway - WebSocket Gateway for real-time audio conversation
 * Handles audio input -> Speech-to-Text -> Gemini 2.5 Pro -> Text-to-Speech -> Audio output
 */
@WebSocketGateway({
    namespace: '/kaiwa'
})
@Injectable()
export class KaiwaGateway implements OnGatewayDisconnect {
    @WebSocketServer()
    server: Server

    private readonly logger = new Logger(KaiwaGateway.name)
    private genAI: GoogleGenerativeAI | null = null

    constructor(
        @InjectQueue(BullQueue.KAIWA_PROCESSOR) private readonly kaiwaQueue: Queue,
        private readonly speechToTextService: SpeechToTextService,
        private readonly textToSpeechService: TextToSpeechService,
        private readonly userAIConversationService: UserAIConversationService,
        private readonly aiConversationRoomService: AIConversationRoomService,
        private readonly i18nService: I18nService,
        private readonly uploadService: UploadService
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
     * Convert LINEAR16 PCM buffer sang WAV format
     */
    private convertLinear16ToWav(pcmBuffer: Buffer, sampleRate: number = 16000): Buffer {
        const numChannels = 1 // Mono
        const bitsPerSample = 16
        const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
        const blockAlign = numChannels * (bitsPerSample / 8)
        const dataSize = pcmBuffer.length
        const fileSize = 36 + dataSize

        // Tạo WAV header
        const wavHeader = Buffer.alloc(44)

        // RIFF header
        wavHeader.write('RIFF', 0)
        wavHeader.writeUInt32LE(fileSize, 4)
        wavHeader.write('WAVE', 8)

        // fmt chunk
        wavHeader.write('fmt ', 12)
        wavHeader.writeUInt32LE(16, 16) // fmt chunk size
        wavHeader.writeUInt16LE(1, 20) // audio format (1 = PCM)
        wavHeader.writeUInt16LE(numChannels, 22)
        wavHeader.writeUInt32LE(sampleRate, 24)
        wavHeader.writeUInt32LE(byteRate, 28)
        wavHeader.writeUInt16LE(blockAlign, 32)
        wavHeader.writeUInt16LE(bitsPerSample, 34)

        // data chunk
        wavHeader.write('data', 36)
        wavHeader.writeUInt32LE(dataSize, 40)

        // Combine header + PCM data
        return Buffer.concat([wavHeader, pcmBuffer])
    }

    /**
     * Convert audio Buffer thành Multer file object để upload
     */
    private bufferToMulterFile(
        buffer: Buffer,
        filename: string,
        mimetype: string
    ): Express.Multer.File {
        return {
            buffer: buffer,
            originalname: filename,
            mimetype: mimetype,
            fieldname: 'audio',
            encoding: '7bit',
            size: buffer.length,
            destination: '',
            filename: filename,
            path: '',
            stream: null as any
        }
    }

    /**
     * Upload audio buffer và trả về URL
     */
    private async uploadAudioBuffer(
        audioBuffer: Buffer,
        filename: string,
        mimetype: string,
        folder: string = 'kaiwa/audio'
    ): Promise<string | null> {
        try {
            const audioFile = this.bufferToMulterFile(audioBuffer, filename, mimetype)
            const result = await this.uploadService.uploadFile(audioFile, folder)
            this.logger.log(`[Kaiwa] Audio uploaded successfully: ${result.url}`)
            return result.url
        } catch (error) {
            this.logger.error(`[Kaiwa] Failed to upload audio: ${error.message}`, error.stack)
            return null
        }
    }

    /**
     * Prepare audio buffer for upload: detect format và convert nếu cần
     * @returns { finalBuffer, mimeType, extension }
     */
    private prepareAudioForUpload(
        audioBuffer: Buffer,
        audioFormat: 'LINEAR16' | 'MP4' | 'M4A' | 'OGG' | 'WEBM',
        requestId: string
    ): { finalBuffer: Buffer; mimeType: string; extension: string } {
        let finalBuffer: Buffer
        let mimeType: string
        let extension: string

        if (audioFormat === 'LINEAR16') {
            // Check xem đã là WAV chưa (có header RIFF)
            if (audioBuffer.length >= 12 && audioBuffer.toString('ascii', 0, 4) === 'RIFF' && audioBuffer.toString('ascii', 8, 12) === 'WAVE') {
                // Đã là WAV format, không cần convert
                finalBuffer = audioBuffer
                mimeType = 'audio/wav'
                extension = 'wav'
                this.logger.log(`[Kaiwa] [${requestId}] Audio already in WAV format, skipping conversion`)
            } else {
                // Raw LINEAR16 PCM, convert sang WAV format
                finalBuffer = this.convertLinear16ToWav(audioBuffer, 16000)
                mimeType = 'audio/wav'
                extension = 'wav'
                this.logger.log(`[Kaiwa] [${requestId}] Converted LINEAR16 PCM to WAV format`)
            }
        } else if (audioFormat === 'MP4' || audioFormat === 'M4A') {
            // MP4/M4A từ mobile - giữ nguyên format
            finalBuffer = audioBuffer
            mimeType = 'audio/mp4' // M4A cũng là MP4 container
            extension = audioFormat === 'MP4' ? 'mp4' : 'm4a'
        } else if (audioFormat === 'OGG') {
            // OGG - giữ nguyên
            finalBuffer = audioBuffer
            mimeType = 'audio/ogg'
            extension = 'ogg'
        } else if (audioFormat === 'WEBM') {
            // WEBM - giữ nguyên
            finalBuffer = audioBuffer
            mimeType = 'audio/webm'
            extension = 'webm'
        } else {
            // Fallback: convert sang WAV
            this.logger.warn(`[Kaiwa] [${requestId}] Unknown audio format: ${audioFormat}, converting to WAV`)
            finalBuffer = this.convertLinear16ToWav(audioBuffer, 16000)
            mimeType = 'audio/wav'
            extension = 'wav'
        }

        return { finalBuffer, mimeType, extension }
    }

    /**
     * Upload audio và update message với audioUrl (reusable cho cả USER và AI)
     * @param audioBuffer - Audio buffer cần upload
     * @param audioFormat - Format của audio
     * @param messageId - ID của message cần update
     * @param role - Role của message ('USER' hoặc 'AI')
     * @param userId - User ID
     * @param conversationId - Conversation ID
     * @param requestId - Request ID cho logging
     * @param client - Socket client để emit event
     * @param folder - Folder để upload (default: 'kaiwa/audio/user' hoặc 'kaiwa/audio/ai')
     */
    private async uploadAndUpdateMessageAudio(
        audioBuffer: Buffer,
        audioFormat: 'LINEAR16' | 'MP4' | 'M4A' | 'OGG' | 'WEBM',
        messageId: number | null,
        role: 'USER' | 'AI',
        userId: number,
        conversationId: string,
        requestId: string,
        client: Socket,
        folder: string = 'kaiwa/audio'
    ): Promise<void> {
        if (!messageId) {
            this.logger.warn(`[Kaiwa] [${requestId}] ⚠️ [Background] ${role} message ID is null, cannot update audioUrl`)
            return
        }

        try {
            // Prepare audio for upload
            const { finalBuffer, mimeType, extension } = this.prepareAudioForUpload(audioBuffer, audioFormat, requestId)

            // Generate filename
            const prefix = role === 'USER' ? 'user' : 'ai'
            const filename = `${prefix}_${userId}_${Date.now()}.${extension}`
            this.logger.log(`[Kaiwa] [${requestId}] [Background] Uploading ${role} audio: format=${audioFormat}, mimeType=${mimeType}, extension=${extension}, size=${finalBuffer.length} bytes`)

            // Upload audio
            const audioUrl = await this.uploadAudioBuffer(finalBuffer, filename, mimeType, folder)

            if (audioUrl) {
                // Update message với audioUrl
                await this.userAIConversationService.update(messageId, {
                    audioUrl: audioUrl
                })
                this.logger.log(`[Kaiwa] [${requestId}] ✅ [Background] Updated ${role} message (ID: ${messageId}) with audioUrl: ${audioUrl}`)

                // Emit event để FE update audioUrl cho message đã hiển thị
                this.logger.log(`[Kaiwa] [${requestId}] 📤 Emitting message-audio-updated for ${role} message (ID: ${messageId})`)
                client.emit(KAIWA_EVENTS.MESSAGE_AUDIO_UPDATED, {
                    conversationId: conversationId,
                    messageId: messageId,
                    audioUrl: audioUrl,
                    role: role
                })
            } else {
                this.logger.warn(`[Kaiwa] [${requestId}] ⚠️ [Background] Audio upload failed, audioUrl is null`)
            }
        } catch (uploadErr) {
            this.logger.error(`[Kaiwa] [${requestId}] ❌ [Background] Failed to upload ${role} audio: ${uploadErr.message}`, uploadErr.stack)
        }
    }

    /**
     * Get room name cho user
     */
    private getRoomName(userId: number): string {
        return `kaiwa_${userId}`
    }

    /**
     * Update room và emit ROOM_UPDATED event (reusable)
     */
    private async updateRoomAndEmit(
        conversationId: string,
        userId: number,
        updateData: any,
        requestId?: string
    ): Promise<void> {
        try {
            const result = await this.aiConversationRoomService.updateByConversationId(conversationId, updateData)
            const roomName = this.getRoomName(userId)
            this.server.to(roomName).emit(KAIWA_EVENTS.ROOM_UPDATED, {
                room: result.data,
                conversationId
            })
            if (requestId) {
                this.logger.log(`[Kaiwa] [${requestId}] ✅ Room updated successfully, title: "${result.data?.title || 'null'}"`)
            }
        } catch (err) {
            const errorMsg = requestId
                ? `[Kaiwa] [${requestId}] Failed to update room: ${err.message}`
                : `[Kaiwa] Failed to update room: ${err.message}`
            this.logger.warn(errorMsg)
        }
    }

    /**
     * Lấy language từ socket handshake headers
     */
    private getLanguageFromSocket(client: Socket): string {
        const acceptLanguage = client.handshake.headers['accept-language']

        if (!acceptLanguage) {
            return 'vi' // Default language
        }

        // Parse Accept-Language header
        // Format: "en-US,en;q=0.9,vi;q=0.8"
        const languages = acceptLanguage
            .split(',')
            .map((lang: string) => {
                const [locale, q] = lang.trim().split(';q=')
                return {
                    locale: locale.split('-')[0], // Get main language code (en from en-US)
                    quality: q ? parseFloat(q) : 1.0
                }
            })
            .sort((a: any, b: any) => b.quality - a.quality)

        // Find supported language
        const supportedLanguages = ['vi', 'en', 'ja']
        for (const lang of languages) {
            if (supportedLanguages.includes(lang.locale)) {
                return lang.locale
            }
        }

        return 'vi' // Default fallback
    }

    /**
     * Generate title cho conversation room từ messages bằng AI
     * @param messages - Array of messages (có thể là toàn bộ hoặc messages gần nhất)
     * @param language - Language for title generation
     * @param useLatestMessages - Nếu true, lấy messages cuối cùng (gần nhất), nếu false lấy messages đầu tiên
     */
    private async generateRoomTitle(
        messages: Array<{ role: string; text: string }>,
        language: string = 'vi',
        useLatestMessages: boolean = false
    ): Promise<string | null> {
        if (!this.genAI || !messages || messages.length === 0) {
            this.logger.warn(`[Kaiwa] generateRoomTitle: genAI=${!!this.genAI}, messages.length=${messages?.length || 0}`)
            return null
        }

        try {
            // Lấy messages để generate title
            // Nếu useLatestMessages = true: lấy 2-3 messages cuối cùng (nội dung gần nhất)
            // Nếu useLatestMessages = false: lấy 2-3 messages đầu tiên (nội dung ban đầu)
            let contextMessages: Array<{ role: string; text: string }>
            if (useLatestMessages) {
                // Lấy 2-3 messages cuối cùng
                contextMessages = messages.slice(-3)
                this.logger.log(`[Kaiwa] generateRoomTitle: Using latest ${contextMessages.length} messages (from total ${messages.length})`)
            } else {
                // Lấy 2-3 messages đầu tiên
                contextMessages = messages.slice(0, 3)
                this.logger.log(`[Kaiwa] generateRoomTitle: Using first ${contextMessages.length} messages (from total ${messages.length})`)
            }
            this.logger.log(`[Kaiwa] generateRoomTitle: Using ${contextMessages.length} messages for context`)

            // Tạo prompt theo ngôn ngữ
            let prompt: string
            let userLabel: string
            let aiLabel: string

            if (language === 'en') {
                userLabel = 'Learner';
                aiLabel = 'AI';
                prompt = `You are a Title Generation AI. Your task is to create a short, concise title (max 50 characters) in English for the following Japanese conversation.
    
                          IMPORTANT:
                        - Respond with ONLY the title text.
                        - DO NOT use markdown (\`**\`), quotation marks, or any other formatting or explanation.
                            
                        Example 1: Self-introduction
                        Example 2: Talking about hobbies
                        Example 3: Ordering at a restaurant
                            
                        ---
                        CONVERSATION:
                            `;
            } else if (language === 'ja') {
                userLabel = '学習者';
                aiLabel = 'AI';
                prompt = `あなたはタイトル生成AIです。以下の日本語の会話に対して、日本語で簡潔なタイトル（最大50文字）を作成してください。
                        重要:
                        - 回答はタイトルのテキストのみにしてください。
                        - マークダウン（\`**\`）や引用符（\`""\`）、その他の説明やフォーマットは一切含めないでください。
                            
                        例1: 自己紹介
                        例2: 天気について
                        例3: 趣味の話
                            
                      ---
                    会話内容:`;
            } else {
                // Default: Vietnamese
                userLabel = 'Người học';
                aiLabel = 'AI';
                prompt = `Bạn là AI chuyên tạo tiêu đề. Nhiệm vụ của bạn là tạo một tiêu đề ngắn (tối đa 50 ký tự) bằng Tiếng Việt cho cuộc hội thoại Tiếng Nhật dưới đây.
    
                        QUAN TRỌNG:
                        - Chỉ trả lời bằng nội dung tiêu đề.
                        - KHÔNG dùng markdown (\`**\`), dấu ngoặc kép, hay bất kỳ lời giải thích nào.
                        
                        Ví dụ 1: Giới thiệu bản thân
                        Ví dụ 2: Hỏi về thời tiết
                        Ví dụ 3: Đặt lịch hẹn
                        
                        ---
                        CUỘC HỘI THOẠI:
                        `;
            }

            const contextText = contextMessages.map(m => {
                const text = m.text || ''
                // Giới hạn độ dài mỗi message để tránh prompt quá dài
                const truncatedText = text.length > 200 ? text.substring(0, 197) + '...' : text
                return `${m.role === 'user' ? userLabel : aiLabel}: ${truncatedText}`
            }).join('\n')
            prompt += contextText

            this.logger.log(`[Kaiwa] generateRoomTitle: Prompt length=${prompt.length}, language=${language}, contextMessages=${contextMessages.length}`)
            this.logger.debug(`[Kaiwa] generateRoomTitle: Prompt preview: ${prompt.substring(0, 200)}...`)

            const model = this.genAI.getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: {
                    temperature: 0.3,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 1000 // Tăng từ 50 lên 100 để đảm bảo có đủ tokens cho response
                },
                safetySettings: [
                    {
                        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                        threshold: HarmBlockThreshold.BLOCK_NONE
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                        threshold: HarmBlockThreshold.BLOCK_NONE
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                        threshold: HarmBlockThreshold.BLOCK_NONE
                    },
                    {
                        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                        threshold: HarmBlockThreshold.BLOCK_NONE
                    }
                ]
            })

            this.logger.log(`[Kaiwa] generateRoomTitle: Calling Gemini API...`)
            const result = await model.generateContent(prompt)
            const response = await result.response

            // Kiểm tra xem có bị block bởi safety filter không
            if (response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0]
                if (candidate.finishReason) {
                    this.logger.log(`[Kaiwa] generateRoomTitle: Finish reason: ${candidate.finishReason}`)
                    if (candidate.finishReason === 'MAX_TOKENS') {
                        this.logger.warn(`[Kaiwa] generateRoomTitle: ⚠️ Hit MAX_TOKENS limit, response may be truncated`)
                    } else if (candidate.finishReason !== 'STOP') {
                        this.logger.warn(`[Kaiwa] generateRoomTitle: ⚠️ Finish reason is ${candidate.finishReason}, may be blocked`)
                    }
                }
                if (candidate.safetyRatings && candidate.safetyRatings.length > 0) {
                    this.logger.log(`[Kaiwa] generateRoomTitle: Safety ratings: ${JSON.stringify(candidate.safetyRatings)}`)
                }
            }

            // Kiểm tra response có hợp lệ không
            if (!response) {
                this.logger.warn(`[Kaiwa] generateRoomTitle: ⚠️ Response is null or undefined`)
                return null
            }

            let title: string = ''
            try {
                title = response.text().trim()
            } catch (textError) {
                this.logger.error(`[Kaiwa] generateRoomTitle: ❌ Error calling response.text(): ${textError.message}`)
                // Thử lấy text từ candidates trực tiếp
                try {
                    const candidates = response.candidates
                    if (candidates && candidates.length > 0) {
                        const candidate = candidates[0]
                        // Kiểm tra content.parts
                        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                            const textPart = candidate.content.parts.find((part: any) => part.text)
                            if (textPart && textPart.text) {
                                title = textPart.text.trim()
                                this.logger.log(`[Kaiwa] generateRoomTitle: Got title from candidates.parts: "${title}"`)
                            } else {
                                this.logger.warn(`[Kaiwa] generateRoomTitle: ⚠️ No text in candidates[0].content.parts`)
                            }
                        } else {
                            this.logger.warn(`[Kaiwa] generateRoomTitle: ⚠️ No content.parts in candidates[0]`)
                        }
                    } else {
                        this.logger.warn(`[Kaiwa] generateRoomTitle: ⚠️ No candidates in response`)
                    }
                } catch (candidateError) {
                    this.logger.error(`[Kaiwa] generateRoomTitle: ❌ Error getting text from candidates: ${candidateError.message}`)
                }
            }

            // Nếu title vẫn rỗng nhưng có MAX_TOKENS, có thể response bị truncated nhưng vẫn có text
            // Thử lấy lại từ candidates một lần nữa
            if ((!title || title.length === 0) && response.candidates && response.candidates.length > 0) {
                const candidate = response.candidates[0]
                if (candidate.finishReason === 'MAX_TOKENS') {
                    this.logger.warn(`[Kaiwa] generateRoomTitle: ⚠️ MAX_TOKENS but title is empty, checking candidates again...`)
                    // Log toàn bộ candidate để debug
                    this.logger.debug(`[Kaiwa] generateRoomTitle: Candidate structure: ${JSON.stringify({
                        finishReason: candidate.finishReason,
                        hasContent: !!candidate.content,
                        hasParts: !!(candidate.content && candidate.content.parts),
                        partsLength: candidate.content?.parts?.length || 0
                    })}`)

                    // Thử lấy text từ parts một lần nữa
                    if (candidate.content && candidate.content.parts) {
                        for (const part of candidate.content.parts) {
                            if (part.text && part.text.trim().length > 0) {
                                title = part.text.trim()
                                this.logger.log(`[Kaiwa] generateRoomTitle: Found text in part after MAX_TOKENS check: "${title}"`)
                                break
                            }
                        }
                    }
                }
            }

            this.logger.log(`[Kaiwa] generateRoomTitle: Raw response from Gemini: "${title}" (length: ${title?.length || 0})`)

            // Giới hạn độ dài title
            if (title && title.length > 0) {
                // Loại bỏ các ký tự không hợp lệ (như markdown formatting, quotes, etc.)
                title = title
                    .replace(/^\*\*|\*\*$/g, '') // Remove **
                    .replace(/^#+\s*/, '') // Remove # headers
                    .replace(/^["']|["']$/g, '') // Remove quotes
                    .replace(/^Tiêu đề:\s*/i, '') // Remove "Tiêu đề:" prefix
                    .replace(/^Title:\s*/i, '') // Remove "Title:" prefix
                    .trim()

                if (title.length > 0) {
                    const finalTitle = title.length > 50 ? title.substring(0, 47) + '...' : title
                    this.logger.log(`[Kaiwa] generateRoomTitle: ✅ Final title: "${finalTitle}"`)
                    return finalTitle
                }
            }

            // Fallback: Tạo title đơn giản từ message đầu tiên nếu Gemini trả về empty
            this.logger.warn(`[Kaiwa] generateRoomTitle: ⚠️ Title is empty, using fallback`)
            if (messages.length >= 2) {
                const firstUserMessage = messages.find(m => m.role === 'user')?.text || ''
                const firstAIMessage = messages.find(m => m.role === 'model')?.text || ''

                // Tạo title đơn giản từ nội dung
                let fallbackTitle = ''
                if (firstUserMessage) {
                    const shortText = firstUserMessage.length > 30 ? firstUserMessage.substring(0, 27) + '...' : firstUserMessage
                    fallbackTitle = `Hội thoại: ${shortText}`
                } else if (firstAIMessage) {
                    const shortText = firstAIMessage.length > 30 ? firstAIMessage.substring(0, 27) + '...' : firstAIMessage
                    fallbackTitle = `Hội thoại: ${shortText}`
                } else {
                    fallbackTitle = 'Cuộc trò chuyện mới'
                }

                this.logger.log(`[Kaiwa] generateRoomTitle: Using fallback title: "${fallbackTitle}"`)
                return fallbackTitle.length > 50 ? fallbackTitle.substring(0, 47) + '...' : fallbackTitle
            }

            this.logger.warn(`[Kaiwa] generateRoomTitle: ⚠️ Title is empty or invalid: "${title}"`)
            return null
        } catch (error) {
            this.logger.error(`[Kaiwa] ❌ Failed to generate room title: ${error.message}`, error.stack)
            return null
        }
    }

    /**
     * Handle sự kiện user-audio-chunk
     * Flow: Audio -> Speech-to-Text -> Gemini 2.5 Pro -> Text-to-Speech -> Audio Response
     */
    @SubscribeMessage(KAIWA_EVENTS.USER_AUDIO_CHUNK)
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
                client.emit(KAIWA_EVENTS.ERROR, { message: ErrorMessage.MISSING_USER_ID })
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

            // Kiểm tra Gemini API không 
            if (!this.genAI) {
                client.emit(KAIWA_EVENTS.ERROR, {
                    message: ErrorMessage.GEMINI_API_NOT_INITIALIZED,
                    suggestion: ErrorMessage.GEMINI_API_KEY_NOT_SET
                })
                return
            }

            // Xử lý payload - convert sang Buffer và detect format
            let audioBuffer: Buffer
            let audioFormat: 'LINEAR16' | 'MP4' | 'M4A' | 'OGG' | 'WEBM' = 'LINEAR16' // Default cho web browser
            let mimeType: string = 'audio/wav' // Default

            if (Buffer.isBuffer(payload)) {
                audioBuffer = payload
            } else if (payload instanceof Uint8Array) {
                audioBuffer = Buffer.from(payload)
            } else if (payload && typeof payload === 'object') {
                // Nếu là object có field audio và có thể có metadata
                if (payload.audio) {
                    if (payload.audio instanceof Uint8Array) {
                        audioBuffer = Buffer.from(payload.audio)
                    } else if (Buffer.isBuffer(payload.audio)) {
                        audioBuffer = payload.audio
                    } else {
                        throw new Error('Invalid audio format: must be Uint8Array or Buffer')
                    }
                } else {
                    throw new Error('Invalid payload: object must have audio field')
                }

                // Detect format từ metadata (nếu có)
                if (payload.format) {
                    audioFormat = payload.format.toUpperCase() as any
                }
                if (payload.mimeType) {
                    mimeType = payload.mimeType
                }
            } else if (typeof payload === 'string') {
                // Nếu là base64 string
                audioBuffer = Buffer.from(payload, 'base64')
            } else {
                throw new Error(`Invalid payload type: expected Buffer, Uint8Array, or object with audio field, got ${typeof payload}`)
            }

            // Auto-detect format từ buffer header nếu chưa có metadata
            // Chỉ detect nếu chưa có format từ metadata
            if (audioFormat === 'LINEAR16' && audioBuffer.length >= 12) {
                const header0_4 = audioBuffer.toString('ascii', 0, 4)
                const header4_8 = audioBuffer.length >= 8 ? audioBuffer.toString('ascii', 4, 8) : ''
                const header8_12 = audioBuffer.length >= 12 ? audioBuffer.toString('ascii', 8, 12) : ''

                // Check WAV format (RIFF...WAVE)
                if (header0_4 === 'RIFF' && header8_12 === 'WAVE') {
                    // WAV file (đã có header, không cần convert)
                    audioFormat = 'LINEAR16' // Vẫn dùng LINEAR16 nhưng đã là WAV format
                    mimeType = 'audio/wav'
                    this.logger.log(`[Kaiwa] [${requestId}] Detected WAV format from header`)
                }
                // Check MP4/M4A format (ftyp ở byte 4)
                else if (header4_8 === 'ftyp' || header4_8.includes('mp4') || header4_8.includes('M4A') || header4_8.includes('isom') || header4_8.includes('qt  ')) {
                    // MP4/M4A file (header thường ở byte 4)
                    audioFormat = (header4_8.includes('M4A') || header4_8.includes('M4A ')) ? 'M4A' : 'MP4'
                    mimeType = 'audio/mp4'
                    this.logger.log(`[Kaiwa] [${requestId}] Detected ${audioFormat} format from header (${header4_8})`)
                }
                // Check OGG format
                else if (header0_4 === 'OggS') {
                    // OGG file
                    audioFormat = 'OGG'
                    mimeType = 'audio/ogg'
                    this.logger.log(`[Kaiwa] [${requestId}] Detected OGG format from header`)
                }
                // Check WEBM format
                else if (header0_4 === 'RIFF' && header8_12 === 'WEBM') {
                    // WEBM file
                    audioFormat = 'WEBM'
                    mimeType = 'audio/webm'
                    this.logger.log(`[Kaiwa] [${requestId}] Detected WEBM format from header`)
                } else {
                    // Raw LINEAR16 PCM (không có header) - sẽ convert sang WAV
                    this.logger.log(`[Kaiwa] [${requestId}] No format header detected (header0_4: "${header0_4}", header4_8: "${header4_8}"), assuming LINEAR16 PCM (will convert to WAV)`)
                }
            } else if (audioFormat === 'LINEAR16') {
                // Buffer quá ngắn, assume là raw PCM
                this.logger.log(`[Kaiwa] [${requestId}] Buffer too short (${audioBuffer.length} bytes) for format detection, assuming LINEAR16 PCM (will convert to WAV)`)
            }

            this.logger.log(`[Kaiwa] [${requestId}] Received audio chunk: ${audioBuffer.length} bytes from user ${userId}, conversationId: ${client.data.conversationId}, detected format: ${audioFormat}, mimeType: ${mimeType}`)

            // Emit processing status
            client.emit(KAIWA_EVENTS.PROCESSING, {
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
                        encoding: 'LINEAR16' //KUMO mốt đổi thành FLAC
                    })

                    const timeoutPromise = new Promise<never>((_, reject) => {
                        setTimeout(() => reject(new Error('Speech-to-Text timeout sau 20 giây')), 20000)
                    })

                    const speechResult = await Promise.race([speechPromise, timeoutPromise])
                    transcription = speechResult.transcript
                    this.logger.log(`[Kaiwa] [${requestId}] Speech-to-Text: "${transcription}" (confidence: ${speechResult.confidence})`)

                    if (!transcription || transcription.trim() === '') {
                        this.logger.warn(`[Kaiwa] Speech-to-Text returned empty transcript`)
                        client.emit(KAIWA_EVENTS.ERROR, {
                            message: ErrorMessage.SPEECH_RECOGNITION_FAILED,
                            suggestion: ErrorMessage.SPEECH_RECOGNITION_SUGGESTION
                        })
                        return
                    }
                } catch (speechError) {
                    this.logger.error(`[Kaiwa] Speech-to-Text error: ${speechError.message}`, speechError.stack)
                    client.emit(KAIWA_EVENTS.ERROR, {
                        message: `${ErrorMessage.SPEECH_CONVERSION_ERROR}: ${speechError.message}`,
                        suggestion: ErrorMessage.CHECK_MICROPHONE_SUGGESTION
                    })
                    return
                }

            // Emit transcription ngay lập tức
            client.emit(KAIWA_EVENTS.TRANSCRIPTION, {
                conversationId: client.data.conversationId,
                text: transcription,
                timestamp: Date.now()
            })

            // Lấy conversation history trước
            let conversationHistory = client.data.conversationHistory || []

            // Lưu USER message vào database NGAY LẬP TỨC (không đợi upload audio)
            // Upload audio sẽ chạy trong background và update audioUrl sau
            // Sử dụng Promise để đảm bảo message được lưu trước khi upload
            this.userAIConversationService
                .create({
                    userId,
                    conversationId: client.data.conversationId,
                    role: 'USER',
                    message: transcription,
                    audioUrl: null // Sẽ update sau khi upload xong
                })
                .then(async (result) => {
                    const userMessageId = result.data?.id || null
                    this.logger.log(`[Kaiwa] [${requestId}] ✅ Saved USER message (ID: ${userMessageId}), starting background audio upload...`)

                        // Upload audio trong background (fire and forget, không block main flow)
                        ; (async () => {
                            await this.uploadAndUpdateMessageAudio(
                                audioBuffer,
                                audioFormat,
                                userMessageId,
                                'USER',
                                userId,
                                client.data.conversationId,
                                requestId,
                                client,
                                'kaiwa/audio/user'
                            )
                        })().catch(err => {
                            this.logger.error(`[Kaiwa] [${requestId}] ❌ [Background] User audio upload promise error: ${err.message}`, err.stack)
                        })
                })
                .catch(err => {
                    this.logger.error(`[Kaiwa] [${requestId}] ❌ Failed to save USER message: ${err.message}`, err.stack)
                })

            // Update room với lastMessage (async, không block)
            // Chỉ update lastMessage, title sẽ được generate sau khi có AI response
            this.updateRoomAndEmit(
                client.data.conversationId,
                userId,
                {
                    lastMessage: transcription.length > 500 ? transcription.substring(0, 500) : transcription,
                    lastMessageAt: new Date()
                },
                requestId
            ).catch(() => { }) // Fire and forget

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

            // Log prompt để debug
            this.logger.debug(`[Kaiwa] [${requestId}] Full prompt length: ${fullPrompt.length}`)
            this.logger.debug(`[Kaiwa] [${requestId}] Prompt preview: ${fullPrompt.substring(0, 200)}...`)
            this.logger.debug(`[Kaiwa] [${requestId}] Conversation history length: ${conversationHistory.length}`)
            this.logger.debug(`[Kaiwa] [${requestId}] Transcription: "${transcription}"`)

            // Emit processing status
            client.emit(KAIWA_EVENTS.PROCESSING, {
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
                        maxOutputTokens: 2048 // Tăng từ 1024 lên 2048 để tránh bị cắt
                    },
                    safetySettings: [
                        {
                            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                            threshold: HarmBlockThreshold.BLOCK_NONE
                        },
                        {
                            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                            threshold: HarmBlockThreshold.BLOCK_NONE
                        },
                        {
                            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                            threshold: HarmBlockThreshold.BLOCK_NONE
                        },
                        {
                            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                            threshold: HarmBlockThreshold.BLOCK_NONE
                        }
                    ]
                })
                const result = await model.generateContent(fullPrompt)
                const response = await result.response

                // Kiểm tra xem có bị block bởi safety filter không
                let candidate: any = null
                if (response.candidates && response.candidates.length > 0) {
                    candidate = response.candidates[0]
                    if (candidate.finishReason === 'SAFETY') {
                        this.logger.warn(`[Kaiwa] Gemini response blocked by safety filter. Finish reason: ${candidate.finishReason}`)
                        throw new Error('Response blocked by safety filter')
                    }
                    if (candidate.finishReason === 'MAX_TOKENS') {
                        this.logger.warn(`[Kaiwa] Gemini response truncated due to MAX_TOKENS - will try to extract text from candidates`)
                    }
                } else {
                    this.logger.warn(`[Kaiwa] Gemini response has no candidates`)
                }

                let text: string = ''
                try {
                    text = response.text()
                } catch (textError) {
                    this.logger.warn(`[Kaiwa] Error calling response.text(): ${textError.message} - will try to extract from candidates`)
                }

                // Nếu text vẫn empty hoặc khi MAX_TOKENS, thử lấy text từ candidates trực tiếp
                if ((!text || text.trim() === '') && candidate) {
                    if (candidate.content && candidate.content.parts) {
                        text = candidate.content.parts
                            .map((part: any) => {
                                // Kiểm tra xem part có text không
                                if (part.text) {
                                    return part.text
                                }
                                // Hoặc có thể là object với text property
                                if (typeof part === 'object' && part.text) {
                                    return part.text
                                }
                                return ''
                            })
                            .filter((t: string) => t && t.trim().length > 0)
                            .join('')

                        if (text && text.trim().length > 0) {
                            this.logger.log(`[Kaiwa] Successfully extracted text from candidates (${text.length} chars)`)
                        }
                    }
                }

                // Log full response để debug
                this.logger.debug(`[Kaiwa] Gemini raw response: "${text}"`)
                this.logger.debug(`[Kaiwa] Gemini response length: ${text?.length || 0}`)
                if (response.candidates && response.candidates.length > 0) {
                    this.logger.debug(`[Kaiwa] Gemini finish reason: ${response.candidates[0].finishReason}`)
                }

                // Fallback nếu Gemini trả về rỗng/không hợp lệ
                const fallbackReply = 'すみません、もう一度お願いします。'
                if (!text || text.trim() === '') {
                    this.logger.warn(`[Kaiwa] Gemini returned empty or whitespace-only response. Using fallback reply.`)
                    return fallbackReply
                }

                // Kiểm tra nếu response chỉ là "..." hoặc quá ngắn
                const trimmedText = text.trim()
                if (trimmedText === '...' || trimmedText.length < 2) {
                    this.logger.warn(`[Kaiwa] Gemini returned invalid response: "${trimmedText}". Using fallback reply.`)
                    return fallbackReply
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
                this.logger.log(`[Kaiwa] [${requestId}] Updated conversationHistory: ${conversationHistory.length} messages`)
            } catch (geminiError) {
                this.logger.error(`[Kaiwa] [${requestId}] Gemini API error: ${geminiError.message}`, geminiError.stack)
                client.data.processingAudio = false
                client.emit(KAIWA_EVENTS.ERROR, {
                    message: `${ErrorMessage.AI_ERROR}: ${geminiError.message}`,
                    suggestion: ErrorMessage.CHECK_GEMINI_API_KEY_SUGGESTION
                })
                return
            }

            // Emit text response ngay lập tức (chỉ có Japanese)
            client.emit(KAIWA_EVENTS.TEXT_RESPONSE, {
                conversationId: client.data.conversationId,
                text: geminiResponse,
                translation: '',
                timestamp: Date.now()
            })

            // Lưu AI response vào database (audioUrl sẽ được update sau khi có TTS)
            // Tạm thời lưu không có audioUrl, sẽ update sau khi upload TTS audio
            let aiMessageId: number | null = null
            this.userAIConversationService
                .create({
                    userId,
                    conversationId: client.data.conversationId,
                    role: 'AI',
                    message: geminiResponse,
                    audioUrl: null // Sẽ update sau khi có TTS audio
                })
                .then((result) => {
                    // Lưu message ID để update audioUrl sau
                    aiMessageId = result.data?.id || null
                    this.logger.log(`[Kaiwa] [${requestId}] ✅ Saved AI message (ID: ${aiMessageId}), waiting for TTS audio...`)
                })
                .catch(err => {
                    this.logger.warn(`[Kaiwa] [${requestId}] Failed to save AI message: ${err.message}`)
                })

            // Update room với lastMessage từ AI (async, không block)
            // Cũng check và generate title nếu chưa có (có thể đã generate ở USER message, nhưng check lại để chắc chắn)
            // conversationHistory đã được update với cả user và AI message ở trên
            this.aiConversationRoomService
                .findByConversationId(client.data.conversationId, userId)
                .then(async (roomResult) => {
                    let room = roomResult?.data

                    // Nếu room chưa tồn tại, tạo mới trước
                    if (!room) {
                        this.logger.log(`[Kaiwa] [${requestId}] Room not found, creating new room for conversationId: ${client.data.conversationId}`)
                        try {
                            const createResult = await this.aiConversationRoomService.create({
                                userId,
                                conversationId: client.data.conversationId,
                                title: null
                            })
                            room = createResult.data
                            this.logger.log(`[Kaiwa] [${requestId}] ✅ Room created successfully`)
                        } catch (createErr) {
                            this.logger.error(`[Kaiwa] [${requestId}] ❌ Failed to create room: ${createErr.message}`, createErr.stack)
                            throw createErr
                        }
                    }

                    // Chỉ generate title một lần khi chưa có title
                    // Chờ đến khi có đủ 4-6 messages để có context tốt nhất
                    const currentHistory = client.data.conversationHistory || conversationHistory
                    this.logger.log(`[Kaiwa] [${requestId}] Current history from client.data: ${currentHistory.length} messages, local conversationHistory: ${conversationHistory.length} messages`)

                    const updateData: any = {
                        lastMessage: geminiResponse.length > 500 ? geminiResponse.substring(0, 500) : geminiResponse,
                        lastMessageAt: new Date()
                    }

                    // Chỉ generate title nếu:
                    // 1. Room chưa có title (null hoặc empty)
                    // 2. Có đủ ít nhất 4 messages (để có context tốt)
                    // 3. Không quá 6 messages (để tránh prompt quá dài)
                    const needsTitle = !room.title || (typeof room.title === 'string' && room.title.trim() === '')
                    const hasEnoughMessages = currentHistory.length >= 4
                    const notTooManyMessages = currentHistory.length <= 6

                    if (needsTitle && hasEnoughMessages && notTooManyMessages) {
                        const language = client.data.language || 'vi'
                        this.logger.log(`[Kaiwa] [${requestId}] Generating title for the first time (lang: ${language}, messages: ${currentHistory.length})`)
                        try {
                            // Sử dụng messages đầu tiên (4-6 messages) để có context ban đầu tốt nhất
                            const generatedTitle = await this.generateRoomTitle(currentHistory, language, false)
                            if (generatedTitle) {
                                updateData.title = generatedTitle
                                this.logger.log(`[Kaiwa] [${requestId}] ✅ Generated title (lang: ${language}): "${generatedTitle}"`)
                            } else {
                                this.logger.warn(`[Kaiwa] [${requestId}] ⚠️ generateRoomTitle returned null`)
                            }
                        } catch (titleError) {
                            this.logger.error(`[Kaiwa] [${requestId}] ❌ Error generating title: ${titleError.message}`, titleError.stack)
                        }
                    } else if (needsTitle) {
                        if (currentHistory.length < 4) {
                            this.logger.log(`[Kaiwa] [${requestId}] ⏭️ Waiting for more messages before generating title (${currentHistory.length}/4)`)
                        } else if (currentHistory.length > 6) {
                            this.logger.log(`[Kaiwa] [${requestId}] ⏭️ Too many messages (${currentHistory.length}), skipping title generation`)
                        }
                    } else {
                        this.logger.log(`[Kaiwa] [${requestId}] ⏭️ Title already exists: "${room.title}", skipping generation`)
                    }

                    this.logger.log(`[Kaiwa] [${requestId}] Updating room with data: ${JSON.stringify({ ...updateData, lastMessage: updateData.lastMessage?.substring(0, 50) + '...' })}`)
                    return this.updateRoomAndEmit(
                        client.data.conversationId,
                        userId,
                        updateData,
                        requestId
                    )
                })
                .catch(err => {
                    this.logger.error(`[Kaiwa] [${requestId}] ❌ Failed to update room with AI message: ${err.message}`, err.stack)
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
                        client.emit(KAIWA_EVENTS.TEXT_RESPONSE_UPDATE, {
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
                            audioEncoding: 'OGG_OPUS', // Đổi từ MP3 sang OGG_OPUS
                            speakingRate: 1.0,
                            pitch: 0.0
                        })

                        if (!result || !result.audioContent || result.audioContent.length === 0) {
                            this.logger.error(`[Kaiwa] [${requestId}] TTS returned empty audio content`)
                            client.emit(KAIWA_EVENTS.ERROR, {
                                message: ErrorMessage.AUDIO_RESPONSE_FAILED,
                                suggestion: ErrorMessage.AUDIO_NOT_AVAILABLE_SUGGESTION
                            })
                            client.data.processingAudio = false
                            return
                        }

                        const audioBase64 = result.audioContent.toString('base64')
                        this.logger.log(`[Kaiwa] [${requestId}] Text-to-Speech completed: ${result.audioContent.length} bytes`)
                        client.emit(KAIWA_EVENTS.AUDIO_RESPONSE, {
                            conversationId: client.data.conversationId,
                            audio: audioBase64,
                            audioFormat: 'ogg', // Đổi từ mp3 sang ogg (OGG_OPUS)
                            text: geminiResponse,
                            timestamp: Date.now()
                        })

                            // Upload AI audio trong BACKGROUND (fire and forget, không block response)
                            ; (async () => {
                                await this.uploadAndUpdateMessageAudio(
                                    result.audioContent,
                                    'OGG', // AI audio luôn là OGG_OPUS
                                    aiMessageId,
                                    'AI',
                                    userId,
                                    client.data.conversationId,
                                    requestId,
                                    client,
                                    'kaiwa/audio/ai'
                                )
                            })().catch(err => {
                                this.logger.error(`[Kaiwa] [${requestId}] ❌ [Background] AI audio upload promise error: ${err.message}`, err.stack)
                            })

                        client.data.processingAudio = false
                        this.logger.log(`[Kaiwa] [${requestId}] Audio processing completed successfully`)
                    } catch (ttsError) {
                        this.logger.error(`[Kaiwa] [${requestId}] Text-to-Speech error: ${ttsError.message}`, ttsError.stack)
                        client.data.processingAudio = false
                        client.emit(KAIWA_EVENTS.ERROR, {
                            message: ErrorMessage.AUDIO_RESPONSE_FAILED,
                            suggestion: ErrorMessage.AUDIO_NOT_AVAILABLE_SUGGESTION
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
            client.emit(KAIWA_EVENTS.ERROR, { message: `${ErrorMessage.PROCESS_AUDIO_FAILED}: ${error.message}` })
        }
    }

    /**
     * Join kaiwa room
     */
    @SubscribeMessage(KAIWA_EVENTS.JOIN_KAIWA_ROOM)
    handleJoinSearchingRoom(
        @ConnectedSocket() client: Socket,
        @MessageBody() data?: { conversationId?: string }
    ): void {
        const userId = client.data?.userId

        if (!userId) {
            this.logger.warn(
                `[KaiwaGateway] Client ${client.id} missing userId in socket.data; unauthorized`
            )
            client.emit(KAIWA_EVENTS.ERROR, { message: ErrorMessage.MISSING_USER_ID })
            return
        }

        // Lấy language từ header và lưu vào client.data
        const language = this.getLanguageFromSocket(client)
        client.data.language = language
        this.logger.log(`[Kaiwa] User ${userId} language detected: ${language}`)

        // Nếu FE gửi conversationId cũ, thử load lịch sử
        const incomingConvId = data?.conversationId?.trim()

        // Đảm bảo conversationId luôn được set trước khi tiếp tục
        if (incomingConvId) {
            // Set conversationId ngay lập tức (dùng incomingConvId)
            client.data.conversationId = incomingConvId
            client.data.conversationHistory = [] // Tạm thời để trống, sẽ load sau

            // Load lịch sử async (không block)
            this.userAIConversationService
                .findByConversationId(incomingConvId, userId)
                .then(async (res) => {
                    const messages = (res.data || []) as Array<any>
                    if (messages.length > 0) {
                        // Map lịch sử vào memory cho prompt tiếp theo
                        const history = messages.map(m => ({
                            role: m.role === 'USER' ? 'user' : 'model',
                            text: m.message
                        }))
                        client.data.conversationHistory = history

                        // Emit history về FE để render ngay
                        client.emit(KAIWA_EVENTS.HISTORY, {
                            conversationId: incomingConvId,
                            messages: messages.map(m => ({
                                role: m.role,
                                message: m.message,
                                audioUrl: m.audioUrl,
                                createdAt: m.createdAt
                            }))
                        })

                        // Chỉ generate title khi join room cũ nếu chưa có title
                        // Không update title nếu đã có (để tránh thay đổi title đã được tạo)
                        if (history.length >= 4 && history.length <= 6) {
                            try {
                                const roomResult = await this.aiConversationRoomService.findByConversationId(incomingConvId, userId)
                                const room = roomResult?.data
                                const needsTitle = !room || !room.title || (typeof room.title === 'string' && room.title.trim() === '')

                                if (needsTitle) {
                                    this.logger.log(`[Kaiwa] Room ${incomingConvId} has ${history.length} messages but no title, generating title...`)
                                    // Sử dụng messages đầu tiên để có context ban đầu tốt nhất
                                    const generatedTitle = await this.generateRoomTitle(history, language, false)
                                    if (generatedTitle) {
                                        await this.updateRoomAndEmit(
                                            incomingConvId,
                                            userId,
                                            { title: generatedTitle }
                                        )
                                        this.logger.log(`[Kaiwa] ✅ Generated title for room ${incomingConvId}: "${generatedTitle}"`)
                                    } else {
                                        this.logger.warn(`[Kaiwa] ⚠️ Failed to generate title for room ${incomingConvId}`)
                                    }
                                } else {
                                    this.logger.log(`[Kaiwa] Room ${incomingConvId} already has title: "${room?.title}", skipping generation`)
                                }
                            } catch (titleErr) {
                                this.logger.warn(`[Kaiwa] Failed to generate title for existing room ${incomingConvId}: ${titleErr.message}`)
                            }
                        } else if (history.length < 4) {
                            this.logger.log(`[Kaiwa] Room ${incomingConvId} has ${history.length} messages (< 4), not enough for title generation`)
                        } else {
                            this.logger.log(`[Kaiwa] Room ${incomingConvId} has ${history.length} messages (> 6), skipping title generation`)
                        }
                    }
                })
                .catch((err) => {
                    this.logger.warn(`[Kaiwa] Failed to load history for conversationId ${incomingConvId}: ${err.message}`)
                    // Giữ nguyên conversationId, chỉ log warning
                })
        } else {
            // Không gửi conversationId → tạo cuộc hội thoại mới (force tạo mới, không dùng conversationId cũ)
            client.data.conversationId = `conv_${userId}_${Date.now()}`
            client.data.conversationHistory = []
            this.logger.log(`[Kaiwa] User ${userId} creating new conversation: ${client.data.conversationId}`)
        }

        // Đảm bảo conversationId đã được set
        if (!client.data.conversationId) {
            this.logger.error(`[Kaiwa] conversationId is still undefined for user ${userId}, creating new one`)
            client.data.conversationId = `conv_${userId}_${Date.now()}`
            client.data.conversationHistory = []
        }

        const roomName = this.getRoomName(userId)
        client.join(roomName)

        const conversationId = client.data.conversationId
        this.logger.log(`[Kaiwa] User ${userId} joined room ${roomName}, conversationId: ${conversationId}`)

        // Tạo hoặc cập nhật AIConversationRoom (async, không block)
        this.aiConversationRoomService
            .create({
                userId,
                conversationId,
                title: null // Có thể tự động tạo title từ message đầu tiên sau
            })
            .then((result) => {
                this.logger.log(`[Kaiwa] Created/updated room for conversationId: ${conversationId}`)
                // Emit room-updated event để FE refresh danh sách
                this.server.to(roomName).emit(KAIWA_EVENTS.ROOM_UPDATED, {
                    room: result.data,
                    conversationId
                })
            })
            .catch(err => {
                this.logger.warn(`[Kaiwa] Failed to create/update room: ${err.message}`)
            })

        // Emit joined event
        client.emit(KAIWA_EVENTS.JOINED, {
            conversationId: conversationId,
            roomName,
            userId
        })
    }


    /**
     * Leave kaiwa room: rời phòng, dọn state và gửi ACK
     */
    @SubscribeMessage(KAIWA_EVENTS.LEAVE_KAIWA_ROOM)
    handleLeaveSearchingRoom(@ConnectedSocket() client: Socket): void {
        try {
            const userId = client.data?.userId
            if (!userId) {
                client.emit(KAIWA_EVENTS.ERROR, { message: ErrorMessage.MISSING_USER_ID })
                return
            }

            const roomName = this.getRoomName(userId)
            client.leave(roomName)

            // Cleanup kaiwa-specific state
            if (client.data) {
                client.data.processingAudio = false
                client.data.conversationId = undefined
                client.data.conversationHistory = undefined
            }

            this.logger.log(`[Kaiwa] User ${userId} left room ${roomName} and state was cleared`)

            // ACK back to client
            client.emit(KAIWA_EVENTS.LEFT, {
                roomName,
                userId,
                timestamp: Date.now()
            })
        } catch (error) {
            this.logger.error(`[Kaiwa] Error handling leave: ${error.message}`)
            client.emit(KAIWA_EVENTS.ERROR, { message: ErrorMessage.LEAVE_ROOM_FAILED })
        }
    }

    /**
     * Handle client disconnect - cleanup conversation state
     */
    handleDisconnect(client: Socket) {
        try {
            const userId = client.data?.userId
            this.logger.log(`[Kaiwa] Client ${client.id} disconnected, cleaning up (userId: ${userId || 'unknown'})`)
            if (client.data) {
                client.data.processingAudio = false
                client.data.conversationId = undefined
                client.data.conversationHistory = undefined
            }
        } catch (err) {
            this.logger.error(`[Kaiwa] Error during disconnect cleanup: ${err.message}`)
        }
    }
}

