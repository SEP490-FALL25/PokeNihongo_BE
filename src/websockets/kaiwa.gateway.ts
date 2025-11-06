// import { KAIWA_EVENTS, SOCKET_ROOM } from '@/common/constants/socket.constant'
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
import { UserAIConversationService } from '@/modules/user-ai-conversation/user-ai-conversation.service'
import { AIConversationRoomService } from '@/modules/ai-conversation-room/ai-conversation-room.service'
import { I18nService } from '@/i18n/i18n.service'

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
        private readonly i18nService: I18nService
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
                    encoding: 'LINEAR16' //KUMO mốt đổi thành FLAC
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

            // Lấy conversation history trước
            let conversationHistory = client.data.conversationHistory || []

            // Lưu USER message vào database (async, không block)
            this.userAIConversationService.create({
                userId,
                conversationId: client.data.conversationId,
                role: 'USER',
                message: transcription
            }).catch(err => {
                this.logger.warn(`[Kaiwa] [${requestId}] Failed to save USER message: ${err.message}`)
            })

            // Update room với lastMessage (async, không block)
            // Chỉ update lastMessage, title sẽ được generate sau khi có AI response
            this.aiConversationRoomService
                .updateByConversationId(client.data.conversationId, {
                    lastMessage: transcription.length > 500 ? transcription.substring(0, 500) : transcription,
                    lastMessageAt: new Date()
                })
                .then((result) => {
                    // Emit room-updated event để FE refresh danh sách
                    const roomName = `kaiwa_${userId}`
                    this.server.to(roomName).emit(KAIWA_EVENTS.ROOM_UPDATED, {
                        room: result.data,
                        conversationId: client.data.conversationId
                    })
                })
                .catch(err => {
                    this.logger.warn(`[Kaiwa] [${requestId}] Failed to update room: ${err.message}`)
                })

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

            // Lưu AI response vào database (async, không block) - audioUrl sẽ được update sau khi có TTS
            this.userAIConversationService.create({
                userId,
                conversationId: client.data.conversationId,
                role: 'AI',
                message: geminiResponse,
                audioUrl: null // Sẽ update sau khi có audio (TODO: upload file và lưu URL)
            }).catch(err => {
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
                    return this.aiConversationRoomService.updateByConversationId(client.data.conversationId, updateData)
                })
                .then((result) => {
                    this.logger.log(`[Kaiwa] [${requestId}] ✅ Room updated successfully, title: "${result.data?.title || 'null'}"`)
                    // Emit room-updated event để FE refresh danh sách
                    const roomName = `kaiwa_${userId}`
                    this.server.to(roomName).emit(KAIWA_EVENTS.ROOM_UPDATED, {
                        room: result.data,
                        conversationId: client.data.conversationId
                    })
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
                            audioEncoding: 'OGG_OPUS', // Đổi từ MP3 sang OGG_OPUS
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
                            audioFormat: 'ogg', // Đổi từ mp3 sang ogg (OGG_OPUS)
                            text: geminiResponse,
                            timestamp: Date.now()
                        })

                        // Update audioUrl trong database nếu đã lưu message (async, không block)
                        // Note: audioUrl có thể là URL file đã upload hoặc base64 data URL
                        // Ở đây tạm để null, có thể upload file và lưu URL sau
                        // TODO: Upload audio file và lưu URL vào audioUrl khi có upload service

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
            client.emit('error', { message: 'Missing userId' })
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
                        client.emit('history', {
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
                                        await this.aiConversationRoomService.updateByConversationId(incomingConvId, {
                                            title: generatedTitle
                                        })
                                        this.logger.log(`[Kaiwa] ✅ Generated title for room ${incomingConvId}: "${generatedTitle}"`)

                                        // Emit room-updated để FE refresh
                                        const roomName = `kaiwa_${userId}`
                                        const updatedRoom = await this.aiConversationRoomService.findByConversationId(incomingConvId, userId)
                                        this.server.to(roomName).emit(KAIWA_EVENTS.ROOM_UPDATED, {
                                            room: updatedRoom.data,
                                            conversationId: incomingConvId
                                        })
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

        const roomName = `kaiwa_${userId}`
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
        client.emit('joined', {
            conversationId: conversationId,
            roomName,
            userId
        })
    }


    /**
     * Leave kaiwa room: rời phòng, dọn state và gửi ACK
     */
    @SubscribeMessage('LEAVE_KAIWA_ROOM')
    handleLeaveSearchingRoom(@ConnectedSocket() client: Socket): void {
        try {
            const userId = client.data?.userId
            if (!userId) {
                client.emit('error', { message: 'Missing userId' })
                return
            }

            const roomName = `kaiwa_${userId}`
            client.leave(roomName)

            // Cleanup kaiwa-specific state
            if (client.data) {
                client.data.processingAudio = false
                client.data.conversationId = undefined
                client.data.conversationHistory = undefined
            }

            this.logger.log(`[Kaiwa] User ${userId} left room ${roomName} and state was cleared`)

            // ACK back to client
            client.emit('left', {
                roomName,
                userId,
                timestamp: Date.now()
            })
        } catch (error) {
            this.logger.error(`[Kaiwa] Error handling leave: ${error.message}`)
            client.emit('error', { message: 'Failed to leave room' })
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

