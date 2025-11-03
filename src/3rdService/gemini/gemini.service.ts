import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAuth } from 'google-auth-library'
import { PrismaService } from '@/shared/services/prisma.service'
// import { GeminiConfigType } from '@prisma/client' // Will be available after migration
import { GeminiConfigRepo } from '@/modules/gemini-config/gemini-config.repo'
import { TextToSpeechService } from '../speech/text-to-speech.service'
import { SpeechToTextService } from '../speech/speech-to-text.service'
import { UploadService } from '../upload/upload.service'
import { SpeakingService } from '@/modules/speaking/speaking.service'
import { DataAccessService } from '@/shared/services/data-access.service'
import { EvaluateSpeakingDto, AIKaiwaDto, ChatWithGeminiDto } from './dto/gemini.dto'
import { SpeakingEvaluationResponse, PersonalizedRecommendationsResponse, AIKaiwaResponse, ChatWithGeminiResponse } from './dto/gemini.response.dto'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import { GEMINI_DEFAULT_CONFIGS } from './config/gemini-default-configs'
import { GeminiConfigType } from '@prisma/client'

@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name)
    private genAI: GoogleGenerativeAI | null = null // Cho Pro models
    private genAIFlash: GoogleGenerativeAI | null = null // Cho Flash models
    private readonly useServiceAccount: boolean
    private auth: GoogleAuth | null = null
    private readonly geminiConfig: any
    // In-memory short TTL cache for recommendations
    private readonly shortCache = new Map<string, { value: PersonalizedRecommendationsResponse; expireAt: number }>()

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
        private readonly geminiConfigRepo: GeminiConfigRepo,
        private readonly textToSpeechService: TextToSpeechService,
        private readonly speechToTextService: SpeechToTextService,
        private readonly uploadService: UploadService,
        private readonly speakingService: SpeakingService,
        private readonly dataAccessService: DataAccessService
    ) {
        this.geminiConfig = this.configService.get('gemini')
        const useServiceAccount = this.geminiConfig?.useServiceAccount || false

        // Ưu tiên dùng service account nếu có (cùng credentials với Speech service)
        if (useServiceAccount && this.geminiConfig?.serviceAccount) {
            const { clientEmail, privateKey, projectId } = this.geminiConfig.serviceAccount

            if (clientEmail && privateKey && projectId) {
                try {
                    // Khởi tạo GoogleAuth với service account credentials
                    this.auth = new GoogleAuth({
                        credentials: {
                            client_email: clientEmail,
                            private_key: privateKey.replace(/\\n/g, '\n'),
                            project_id: projectId
                        },
                        scopes: ['https://www.googleapis.com/auth/generative-language']
                    })

                    this.useServiceAccount = true
                    this.logger.log(`Gemini AI will use Google Cloud service account (project: ${projectId})`)
                    return
                } catch (error) {
                    this.logger.warn('Failed to initialize service account, falling back to API key:', error)
                }
            }
        }

        // Khởi tạo API keys (nếu có) - lazy initialization
        this.useServiceAccount = false
        this.logger.log('Gemini AI will use API keys (lazy initialization per model)')
    }

    /**
     * Danh sách các models chỉ sử dụng API key (không dùng service account)
     */
    private readonly apiKeyOnlyModels = [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'text-embedding-004'
    ]

    /**
     * Lấy GoogleGenerativeAI instance dựa trên model name
     * @param modelName - Tên model Gemini
     * @param forceUseServiceAccount - Force dùng Service Account nếu true, force dùng API Key nếu false, auto nếu undefined
     * - Các models trong apiKeyOnlyModels: chỉ dùng API key, không dùng service account (trừ khi force)
     * - Nếu model chứa "flash" → dùng GEMINI_FLASH_API_KEY (nếu có), fallback về GEMINI_API_KEY hoặc serviceAccount
     * - Nếu model không phải flash → dùng GEMINI_API_KEY hoặc serviceAccount
     */
    private async getGenAIForModel(modelName: string, forceUseServiceAccount?: boolean): Promise<GoogleGenerativeAI> {
        const normalizedModelName = modelName.toLowerCase()
        const isApiKeyOnlyModel = this.apiKeyOnlyModels.some(m => normalizedModelName.includes(m.toLowerCase()))
        const isFlashModel = normalizedModelName.includes('flash')

        // Nếu forceUseServiceAccount được set, ưu tiên theo flag này
        const shouldUseServiceAccount = forceUseServiceAccount !== undefined
            ? forceUseServiceAccount
            : (this.useServiceAccount && !isApiKeyOnlyModel)

        // Nếu là Flash model
        if (isFlashModel) {
            if (this.genAIFlash) {
                return this.genAIFlash
            }

            // Nếu force dùng Service Account
            if (shouldUseServiceAccount && this.auth) {
                try {
                    const token = await this.auth.getAccessToken()
                    if (!token) {
                        throw new Error('Failed to get access token from service account')
                    }
                    this.genAIFlash = new GoogleGenerativeAI(token as string)
                    this.logger.log(`Gemini Flash initialized with Google Cloud service account token (forced: ${forceUseServiceAccount !== undefined})`)
                    return this.genAIFlash
                } catch (error) {
                    if (forceUseServiceAccount === true) {
                        throw new Error(`Failed to use Service Account: ${error instanceof Error ? error.message : String(error)}`)
                    }
                    this.logger.warn('Failed to get access token for Flash, falling back to API key:', error)
                }
            } else if (forceUseServiceAccount === true && !this.auth) {
                throw new Error('Service Account được yêu cầu nhưng chưa được cấu hình. Vui lòng kiểm tra GOOGLE_CLOUD_* credentials trong .env')
            } else if (!isApiKeyOnlyModel && forceUseServiceAccount === undefined) {
                this.logger.log(`Model ${modelName} is configured to use API key only (skipping service account)`)
            }

            // Ưu tiên dùng Flash API key nếu có
            const flashApiKey = this.geminiConfig?.flashApiKey || ''
            if (flashApiKey && flashApiKey.trim() !== '') {
                this.genAIFlash = this.initializeWithApiKey(flashApiKey, 'Flash')
                return this.genAIFlash
            }

            // Fallback về regular API key nếu có
            const apiKey = this.geminiConfig?.apiKey || ''
            if (apiKey && apiKey.trim() !== '') {
                this.logger.warn('GEMINI_FLASH_API_KEY not found, using GEMINI_API_KEY for Flash model')
                this.genAIFlash = this.initializeWithApiKey(apiKey, 'Flash (fallback)')
                return this.genAIFlash
            }

            throw new Error('No API key configured for Flash models. Please set GEMINI_FLASH_API_KEY or GEMINI_API_KEY in .env')
        }

        // Nếu là Pro model hoặc model khác
        if (this.genAI) {
            return this.genAI
        }

        // Nếu force dùng Service Account
        if (shouldUseServiceAccount && this.auth) {
            try {
                const token = await this.auth.getAccessToken()
                if (!token) {
                    throw new Error('Failed to get access token from service account')
                }
                this.genAI = new GoogleGenerativeAI(token as string)
                this.logger.log(`Gemini Pro initialized with Google Cloud service account token (forced: ${forceUseServiceAccount !== undefined})`)
                return this.genAI
            } catch (error) {
                if (forceUseServiceAccount === true) {
                    throw new Error(`Failed to use Service Account: ${error instanceof Error ? error.message : String(error)}`)
                }
                this.logger.error('Failed to get access token from service account, falling back to API key:', error)
            }
        } else if (forceUseServiceAccount === true && !this.auth) {
            throw new Error('Service Account được yêu cầu nhưng chưa được cấu hình. Vui lòng kiểm tra GOOGLE_CLOUD_* credentials trong .env')
        } else if (!isApiKeyOnlyModel && forceUseServiceAccount === undefined) {
            this.logger.log(`Model ${modelName} is configured to use API key only (skipping service account)`)
        }

        // Dùng regular API key
        const apiKey = this.geminiConfig?.apiKey || ''
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('GEMINI_API_KEY is required but not configured. Please set GEMINI_API_KEY in your .env file')
        }

        const modelType = isApiKeyOnlyModel ? (normalizedModelName.includes('embedding') ? 'Embedding' : 'Pro') : 'Pro'
        this.genAI = this.initializeWithApiKey(apiKey, modelType)
        return this.genAI
    }

    /**
     * Seed/update default Gemini configs into database
     */
    async seedDefaultConfigs(): Promise<{ updated: number; created: number; restored: number; summary: Array<{ configType: string; modelName: string; isActive: boolean }> }> {
        let updated = 0
        let created = 0
        let restored = 0

        for (const config of GEMINI_DEFAULT_CONFIGS) {
            try {
                const existing = await (this.prisma as any).geminiConfig.findUnique({
                    where: { configType: config.configType as GeminiConfigType }
                })

                if (existing && !existing.deletedAt) {
                    await (this.prisma as any).geminiConfig.update({
                        where: { configType: config.configType as GeminiConfigType },
                        data: {
                            modelName: config.modelName,
                            prompt: config.prompt,
                            isActive: config.isActive
                        }
                    })
                    updated++
                } else if (existing && existing.deletedAt) {
                    await (this.prisma as any).geminiConfig.update({
                        where: { configType: config.configType as GeminiConfigType },
                        data: {
                            modelName: config.modelName,
                            prompt: config.prompt,
                            isActive: config.isActive,
                            deletedAt: null,
                            deletedById: null
                        }
                    })
                    restored++
                } else {
                    await (this.prisma as any).geminiConfig.create({
                        data: {
                            configType: config.configType as GeminiConfigType,
                            modelName: config.modelName,
                            prompt: config.prompt,
                            isActive: config.isActive
                        }
                    })
                    created++
                }
            } catch (err) {
                this.logger.error(`Seed config failed for ${config.configType}:`, err)
            }
        }

        const all = await (this.prisma as any).geminiConfig.findMany({
            where: { deletedAt: null },
            select: { configType: true, modelName: true, isActive: true }
        })

        return { updated, created, restored, summary: all }
    }

    /**
     * Khởi tạo GoogleGenerativeAI với API key
     */
    private initializeWithApiKey(apiKey: string, modelType: string = ''): GoogleGenerativeAI {
        if (!apiKey || apiKey.trim() === '') {
            throw new Error('API key is required but not provided')
        }

        // Log một phần API key để debug (chỉ log 8 ký tự đầu và cuối)
        const maskedKey = apiKey.length > 16
            ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`
            : '***'
        const typeLabel = modelType ? ` (${modelType})` : ''
        this.logger.log(`Gemini AI${typeLabel} initializing with API key: ${maskedKey}`)

        const genAI = new GoogleGenerativeAI(apiKey)
        this.logger.log(`Gemini AI${typeLabel} initialized successfully`)
        return genAI
    }

    /**
     * @deprecated Sử dụng getGenAIForModel() thay vì method này
     * Lấy GoogleGenerativeAI instance (lazy initialization cho service account)
     */
    private async getGenAI(): Promise<GoogleGenerativeAI> {
        // Default dùng Pro model
        return this.getGenAIForModel('gemini-1.5-pro')
    }

    /**
     * Đánh giá phát âm SPEAKING cho user
     */
    async evaluateSpeaking(
        userId: number,
        questionBankId: number,
        data: EvaluateSpeakingDto
    ): Promise<SpeakingEvaluationResponse> {
        try {
            this.logger.log(`Evaluating speaking for user ${userId}, questionBank ${questionBankId}`)

            // Kiểm tra questionBank tồn tại và là SPEAKING type
            const questionBank = await this.prisma.questionBank.findUnique({
                where: { id: questionBankId },
                select: {
                    id: true,
                    questionKey: true,
                    questionType: true
                }
            })

            if (!questionBank) {
                throw new BadRequestException('QuestionBank không tồn tại')
            }

            if (questionBank.questionType !== 'SPEAKING') {
                throw new BadRequestException('QuestionBank phải là loại SPEAKING')
            }

            // Lấy config default theo mapping service ↔ config
            const svcCfg = await this.geminiConfigRepo.getDefaultConfigForService('SPEAKING_EVALUATION' as any)
            const config: any = svcCfg?.geminiConfig || null
            const prompt = config
                ? this.replacePlaceholders(String(config.prompt || ''), { text: data.text, transcription: data.transcription || data.text })
                : this.buildSpeakingEvaluationPrompt(data.text, data.transcription || data.text)
            const modelName = (config?.geminiConfigModel?.geminiModel?.key as string) || 'gemini-1.5-pro'

            // Gọi Gemini API - chọn API key dựa trên model
            const genAI = await this.getGenAIForModel(modelName)
            const model = genAI.getGenerativeModel({ model: modelName })
            const result = await model.generateContent(prompt)
            const response = await result.response

            if (!response) {
                throw new Error('Empty response from Gemini API')
            }

            const text = response.text()

            if (!text || text.trim() === '') {
                throw new Error('Empty text in Gemini API response')
            }

            // Parse response từ Gemini
            const evaluation = this.parseSpeakingEvaluationResponse(text)

            // Lưu kết quả vào UserSpeakingAttempt
            await this.prisma.userSpeakingAttempt.create({
                data: {
                    userId,
                    questionBankId,
                    userAudioUrl: data.audioUrl,
                    userTranscription: data.transcription || data.text,
                    confidence: null, // Có thể lấy từ Speech-to-Text service
                    accuracy: evaluation.accuracy,
                    pronunciation: evaluation.pronunciation,
                    fluency: evaluation.fluency,
                    overallScore: evaluation.overallScore,
                    googleApiResponse: {
                        feedback: evaluation.feedback,
                        suggestions: evaluation.suggestions
                    } as any
                }
            })

            this.logger.log(`Speaking evaluation completed for user ${userId}`)

            return evaluation
        } catch (error) {
            this.logger.error('Error evaluating speaking:', error)
            if (error instanceof BadRequestException) {
                throw error
            }

            // Kiểm tra nếu là lỗi 403 Forbidden (API key issue)
            if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
                throw new BadRequestException('Lỗi xác thực API key. Vui lòng kiểm tra GEMINI_API_KEY trong file .env')
            }

            throw new BadRequestException('Không thể đánh giá phát âm: ' + (error instanceof Error ? error.message : String(error)))
        }
    }

    /**
     * Lấy gợi ý cá nhân hóa dựa trên dữ liệu userExercises và userTest
     */
    async getPersonalizedRecommendations(
        userId: number,
        limit: number = 10,
        forceUseServiceAccount?: boolean,
        options?: { createSrs?: boolean; allowedTypes?: string[] }
    ): Promise<PersonalizedRecommendationsResponse> {
        try {
            this.logger.log(`Getting personalized recommendations for user ${userId}`)
            // Cache key (policy-independent best-effort). If policy changes often, TTL is short.
            const cacheKey = `rec:${userId}:${limit}`
            const cached = this.shortCache.get(cacheKey)
            const now = Date.now()
            if (cached && cached.expireAt > now) {
                return cached.value
            }
            // Lấy config default theo mapping service ↔ config
            const svcCfg = await this.geminiConfigRepo.getDefaultConfigForService('PERSONALIZED_RECOMMENDATIONS' as any)
            const config: any = svcCfg?.geminiConfig || null
            const policy = (config?.geminiConfigModel?.extraParams as any)?.policy

            let analysis: any
            if (policy) {
                // Lấy dữ liệu theo policy (scope + whitelist + masking)
                const safeData = await this.dataAccessService.getAiSafeData(userId, policy)
                analysis = this.buildSummaryFromSafeData(safeData, limit)
            } else {
                // Fallback legacy: query trực tiếp để phân tích
                const [exerciseAttempts, testAttempts] = await Promise.all([
                    this.prisma.userExerciseAttempt.findMany({
                        where: { userId },
                        include: {
                            exercise: { include: { lesson: true } },
                            userAnswerLogs: { include: { questionBank: true } }
                        },
                        orderBy: { updatedAt: 'desc' },
                        take: 50
                    }),
                    this.prisma.userTestAttempt.findMany({
                        where: { userId },
                        include: { test: true, userTestAnswerLogs: { include: { questionBank: true } } },
                        orderBy: { updatedAt: 'desc' },
                        take: 50
                    })
                ])
                analysis = this.analyzeUserPerformance(exerciseAttempts, testAttempts)
            }

            const prompt = config
                ? this.replacePlaceholders(String(config.prompt || ''), { analysis: JSON.stringify(analysis), limit: limit.toString() })
                : this.buildRecommendationPrompt(analysis, limit)
            // Chỉ dùng model từ config, không cho override từ request
            const modelName = (config?.geminiConfigModel?.geminiModel?.key as string) || 'gemini-2.5-pro'

            // Gọi Gemini API - chọn API key dựa trên model
            const genAI = await this.getGenAIForModel(modelName, forceUseServiceAccount)
            const model = genAI.getGenerativeModel({ model: modelName })
            const result = await model.generateContent(prompt)
            const response = await result.response

            if (!response) {
                throw new Error('Empty response from Gemini API')
            }

            const text = response.text()

            if (!text || text.trim() === '') {
                throw new Error('Empty text in Gemini API response')
            }

            // Parse response từ Gemini
            let recommendations = this.parseRecommendationsResponse(text, analysis)
            if (options?.allowedTypes && options.allowedTypes.length > 0) {
                const allow = new Set(options.allowedTypes.map(t => String(t).toUpperCase()))
                recommendations = recommendations.filter((r: any) => allow.has(String(r.contentType || '').toUpperCase()))
            }
            const payload: PersonalizedRecommendationsResponse = {
                recommendations: recommendations.slice(0, limit),
                summary: analysis
            }
            // Tạo SRS reviews từ recommendations
            try {
                // SRS types: VOCABULARY, GRAMMAR, KANJI, TEST, EXERCISE
                const validSrsTypes = ['VOCABULARY', 'GRAMMAR', 'KANJI', 'TEST', 'EXERCISE']
                const srsRows = (options?.createSrs ? (payload.recommendations || []) : []).map((r: any) => {
                    const contentType = (r.contentType || 'VOCABULARY').toUpperCase()
                    const contentId = Number(r.contentId) || 0

                    // Validate contentType và contentId
                    if (!contentId || !validSrsTypes.includes(contentType)) {
                        if (contentType && !validSrsTypes.includes(contentType)) {
                            this.logger.warn(`Skipping invalid contentType: ${contentType} (contentId: ${contentId})`)
                        }
                        return null
                    }

                    return {
                        userId,
                        contentType,
                        contentId,
                        message: r.message || r.reason || '',
                        srsLevel: 0, // Mới học
                        nextReviewDate: new Date(), // Ôn ngay
                        incorrectStreak: 0,
                        isLeech: false
                    }
                }).filter(Boolean)

                if (srsRows.length > 0) {
                    // Upsert SRS (create hoặc update nếu đã tồn tại)
                    for (const srs of srsRows as any[]) {
                        if (!srs) continue
                        await (this.prisma as any).userSrsReview.upsert({
                            where: {
                                userId_contentType_contentId: {
                                    userId: srs.userId,
                                    contentType: srs.contentType as any,
                                    contentId: srs.contentId
                                }
                            },
                            update: {
                                srsLevel: 0, // Reset về level 0 nếu đã có
                                nextReviewDate: new Date(),
                                incorrectStreak: 0,
                                isLeech: false,
                                message: srs.message || '',
                                updatedAt: new Date()
                            },
                            create: srs
                        })
                    }
                    this.logger.log(`Created/updated ${srsRows.length} SRS reviews`)
                }

                // Lưu recommendations vào DB để FE có thể hiển thị lại/ghi nhận hành động
                const recRows = (payload.recommendations || []).map((r: any) => ({
                    userId,
                    targetType: (r.contentType || 'VOCABULARY').toUpperCase(),
                    targetId: Number(r.contentId) || 0,
                    reason: String(r.reason || ''),
                    source: 'PERSONALIZED',
                    modelUsed: modelName
                })).filter((r: any) => r.targetId > 0)

                if (recRows.length > 0) {
                    await (this.prisma as any).userAIRecommendation.createMany({ data: recRows, skipDuplicates: true })
                }
            } catch (e) {
                this.logger.warn('Failed to persist SRS/recommendations', e as any)
            }

            // Cache 120s
            this.shortCache.set(cacheKey, { value: payload, expireAt: now + 120_000 })
            return payload
        } catch (error) {
            this.logger.error('Error getting personalized recommendations:', error)

            // Kiểm tra nếu là lỗi 403 Forbidden (API key issue)
            if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
                throw new BadRequestException('Lỗi xác thực API key. Vui lòng kiểm tra GEMINI_API_KEY trong file .env')
            }

            throw new BadRequestException('Không thể lấy gợi ý cá nhân hóa: ' + (error instanceof Error ? error.message : String(error)))
        }
    }

    /**
     * Build compact analysis from safeData (policy result) to minimize tokens
     * Focus on incorrect answers for SRS mapping
     */
    private buildSummaryFromSafeData(safeData: Record<string, any[]>, limit: number) {
        // Data đã được limit ở DataAccessService theo policy config, không cần slice nữa
        const answerLogs = safeData['UserAnswerLog'] || []
        const testAnswerLogs = safeData['UserTestAnswerLog'] || []
        const exerciseAttempts = safeData['UserExerciseAttempt'] || []
        const testAttempts = safeData['UserTestAttempt'] || []
        const questionBanks = safeData['QuestionBank'] || []
        const answers = safeData['Answer'] || []
        const vocabularies = safeData['Vocabulary'] || []
        const existingSrs = (safeData['UserSrsReview'] || []).map((s: any) => `${s.contentType}-${s.contentId}`)

        // Build maps for quick lookup
        const qbMap = new Map<number, any>()
        for (const qb of questionBanks) {
            if (qb && qb.id != null) qbMap.set(qb.id as number, qb)
        }

        const answerMap = new Map<number, any>()
        for (const ans of answers) {
            if (ans && ans.id != null) answerMap.set(ans.id as number, ans)
        }

        // Build exercise/test attempt maps for quick lookup
        const exerciseAttemptMap = new Map<number, number>() // attemptId -> exerciseId
        for (const attempt of exerciseAttempts) {
            if (attempt.id && attempt.exerciseId) {
                exerciseAttemptMap.set(attempt.id, attempt.exerciseId)
            }
        }

        const testAttemptMap = new Map<number, number>() // attemptId -> testId
        for (const attempt of testAttempts) {
            if (attempt.id && attempt.testId) {
                testAttemptMap.set(attempt.id, attempt.testId)
            }
        }

        // Collect incorrect answers (recent, within 7 days)
        const recentIncorrect: any[] = []
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        for (const log of answerLogs) {
            if (!log.isCorrect && log.questionBankId) {
                const qb = qbMap.get(log.questionBankId)
                if (qb && log.createdAt && new Date(log.createdAt) >= sevenDaysAgo) {
                    const ans = log.answerId ? answerMap.get(log.answerId) : null
                    const exerciseId = log.userExerciseAttemptId ? exerciseAttemptMap.get(log.userExerciseAttemptId) : null
                    recentIncorrect.push({
                        questionBankId: log.questionBankId,
                        questionType: qb.questionType,
                        questionJp: qb.questionJp || '',
                        levelN: qb.levelN,
                        createdAt: log.createdAt,
                        answerJp: ans?.answerJp || '',
                        exerciseId
                    })
                }
            }
        }

        for (const log of testAnswerLogs) {
            if (!log.isCorrect && log.questionBankId) {
                const qb = qbMap.get(log.questionBankId)
                if (qb && log.createdAt && new Date(log.createdAt) >= sevenDaysAgo) {
                    const ans = log.answerId ? answerMap.get(log.answerId) : null
                    const testId = log.userTestAttemptId ? testAttemptMap.get(log.userTestAttemptId) : null
                    recentIncorrect.push({
                        questionBankId: log.questionBankId,
                        questionType: qb.questionType,
                        questionJp: qb.questionJp || '',
                        levelN: qb.levelN,
                        createdAt: log.createdAt,
                        answerJp: ans?.answerJp || '',
                        testId
                    })
                }
            }
        }

        // Sort by most recent
        recentIncorrect.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        // Group failed tests/exercises
        const failedTests = new Map<number, { testId: number; score?: number; updatedAt: any; questionTypes: Set<string> }>()
        const failedExercises = new Map<number, { exerciseId: number; updatedAt: any; questionTypes: Set<string> }>()

        for (const attempt of testAttempts) {
            if (attempt.score !== null && (attempt.score < 60 || attempt.status === 'FAIL')) {
                const existing = failedTests.get(attempt.testId) || { testId: attempt.testId, score: attempt.score, updatedAt: attempt.updatedAt, questionTypes: new Set<string>() }
                // Thêm question types từ test answer logs
                for (const tal of testAnswerLogs) {
                    if (tal.userTestAttemptId === attempt.id && !tal.isCorrect) {
                        const qb = qbMap.get(tal.questionBankId)
                        if (qb) existing.questionTypes.add(qb.questionType)
                    }
                }
                failedTests.set(attempt.testId, existing)
            }
        }

        for (const attempt of exerciseAttempts) {
            if (attempt.status === 'FAIL' || attempt.status === 'ABANDONED') {
                const existing = failedExercises.get(attempt.exerciseId) || { exerciseId: attempt.exerciseId, updatedAt: attempt.updatedAt, questionTypes: new Set<string>() }
                // Thêm question types từ answer logs
                for (const al of answerLogs) {
                    if (al.userExerciseAttemptId === attempt.id && !al.isCorrect) {
                        const qb = qbMap.get(al.questionBankId)
                        if (qb) existing.questionTypes.add(qb.questionType)
                    }
                }
                failedExercises.set(attempt.exerciseId, existing)
            }
        }

        return {
            recentIncorrect: recentIncorrect.slice(0, 100),
            vocabularies: vocabularies.slice(0, 500).map((v: any) => ({
                id: v.id,
                wordJp: v.wordJp,
                reading: v.reading,
                levelN: v.levelN
            })),
            failedTests: Array.from(failedTests.values()).map((t: any) => ({
                testId: t.testId,
                score: t.score,
                updatedAt: t.updatedAt,
                questionTypes: Array.from(t.questionTypes)
            })),
            failedExercises: Array.from(failedExercises.values()).map((e: any) => ({
                exerciseId: e.exerciseId,
                updatedAt: e.updatedAt,
                questionTypes: Array.from(e.questionTypes)
            })),
            srs: {
                existing: existingSrs
            }
        }
    }

    // === Saved recommendations (DB) ===
    async listSavedRecommendations(userId: number, status?: 'PENDING' | 'DONE' | 'DISMISSED', limit: number = 50) {
        const where: any = { userId }
        if (status) where.status = status
        const rows = await (this.prisma as any).userAIRecommendation.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit
        })
        // Chuẩn hoá UI
        return {
            title: 'Làm lại để cải thiện',
            items: rows.map((r: any) => ({
                type: (r.targetType || 'EXERCISE').toLowerCase(),
                id: r.targetId,
                reason: r.reason,
                status: r.status,
                createdAt: r.createdAt
            }))
        }
    }

    async updateRecommendationStatus(userId: number, id: number, status: 'DONE' | 'DISMISSED') {
        const rec = await (this.prisma as any).userAIRecommendation.findFirst({ where: { id, userId } })
        if (!rec) throw new (require('@nestjs/common').BadRequestException)('Recommendation không tồn tại')
        const updated = await (this.prisma as any).userAIRecommendation.update({ where: { id }, data: { status } })
        return { id: updated.id, status: updated.status }
    }

    /**
     * AI Kaiwa - Hội thoại với AI bằng tiếng Nhật
     */
    async aiKaiwa(
        userId: number,
        data: AIKaiwaDto
    ): Promise<AIKaiwaResponse> {
        try {
            this.logger.log(`AI Kaiwa request from user ${userId}, conversationId: ${data.conversationId || 'new'}`)

            // Validate input: phải có message hoặc audioUrl
            if (!data.message && !data.audioUrl) {
                throw new BadRequestException('Phải có message hoặc audioUrl')
            }

            let userMessage: string = data.message || ''
            let transcription: string | undefined = undefined
            let pronunciationAssessment: any = undefined

            // Nếu có audioUrl, convert audio sang text bằng Speech-to-Text
            if (data.audioUrl) {
                try {
                    this.logger.log(`Converting audio to text: ${data.audioUrl}`)

                    // Download audio file
                    const audioResponse = await axios.get(data.audioUrl, {
                        responseType: 'arraybuffer'
                    })
                    const audioBuffer = Buffer.from(audioResponse.data)

                    // Convert audio to text
                    const speechResult = await this.speechToTextService.convertAudioToText(audioBuffer, {
                        languageCode: 'ja-JP',
                        enableAutomaticPunctuation: true
                    })

                    transcription = speechResult.transcript
                    userMessage = transcription || userMessage // Ưu tiên transcription nếu có

                    this.logger.log(`Speech-to-Text result: ${transcription} (confidence: ${speechResult.confidence})`)

                    // Đánh giá phát âm nếu có reference text và assessPronunciation = true
                    if (data.assessPronunciation && data.message && transcription) {
                        try {
                            // Option 1: Sử dụng SpeakingService để đánh giá (đơn giản hơn, dựa trên confidence)
                            // Option 2: Sử dụng Gemini để đánh giá chi tiết hơn

                            // Tái sử dụng logic từ SpeakingService - chỉ tính toán dựa trên confidence
                            const baseScore = Math.min(speechResult.confidence * 100, 100)
                            const accuracy = Math.round(baseScore)
                            const pronunciationScore = Math.round(baseScore * 0.9 + (transcription.length > 0 ? 10 : 0))
                            const fluencyScore = Math.round(baseScore * 0.85 + (speechResult.confidence > 0.8 ? 15 : 0))
                            const overallScore = Math.round((accuracy * 0.4 + pronunciationScore * 0.3 + fluencyScore * 0.3))

                            // So sánh với reference text bằng Gemini để có đánh giá chi tiết hơn
                            const svcCfg = await this.geminiConfigRepo.getDefaultConfigForService('SPEAKING_EVALUATION' as any)
                            const config: any = svcCfg?.geminiConfig || null
                            const prompt = config
                                ? this.replacePlaceholders(String(config.prompt || ''), {
                                    text: data.message,
                                    transcription: transcription
                                })
                                : this.buildSpeakingEvaluationPrompt(data.message, transcription)

                            const modelName = (config?.geminiConfigModel?.geminiModel?.key as string) || 'gemini-1.5-pro'
                            const genAI = await this.getGenAIForModel(modelName)
                            const model = genAI.getGenerativeModel({ model: modelName })
                            const result = await model.generateContent(prompt)
                            const response = await result.response
                            const evaluationText = response.text()

                            if (evaluationText) {
                                const evaluation = this.parseSpeakingEvaluationResponse(evaluationText)
                                pronunciationAssessment = {
                                    accuracy: evaluation.accuracy,
                                    pronunciation: evaluation.pronunciation,
                                    fluency: evaluation.fluency,
                                    overallScore: evaluation.overallScore,
                                    feedback: evaluation.feedback,
                                    suggestions: evaluation.suggestions,
                                    confidence: speechResult.confidence
                                }
                                this.logger.log(`Pronunciation assessment completed: ${evaluation.overallScore}/100`)
                            } else {
                                // Fallback: dùng scores từ SpeakingService logic
                                let feedback = ''
                                if (overallScore >= 90) {
                                    feedback = 'Phát âm xuất sắc! Hãy tiếp tục luyện tập.'
                                } else if (overallScore >= 80) {
                                    feedback = 'Phát âm tốt, cần cải thiện một chút về độ trôi chảy.'
                                } else if (overallScore >= 70) {
                                    feedback = 'Phát âm khá tốt, hãy luyện tập thêm để cải thiện.'
                                } else if (overallScore >= 60) {
                                    feedback = 'Cần luyện tập thêm về phát âm và độ trôi chảy.'
                                } else {
                                    feedback = 'Hãy luyện tập nhiều hơn để cải thiện phát âm.'
                                }

                                pronunciationAssessment = {
                                    accuracy,
                                    pronunciation: pronunciationScore,
                                    fluency: fluencyScore,
                                    overallScore,
                                    feedback,
                                    suggestions: [],
                                    confidence: speechResult.confidence
                                }
                            }
                        } catch (evalError) {
                            this.logger.warn('Failed to assess pronunciation, continuing without assessment:', evalError)
                            // Không throw error, chỉ log warning
                        }
                    }
                } catch (audioError) {
                    this.logger.error('Failed to process audio:', audioError)
                    throw new BadRequestException('Không thể xử lý audio file: ' + (audioError instanceof Error ? audioError.message : String(audioError)))
                }
            }

            if (!userMessage || userMessage.trim() === '') {
                throw new BadRequestException('Không thể lấy được message từ audio hoặc text')
            }

            // Generate hoặc dùng conversationId có sẵn
            const conversationId = data.conversationId || `conv_${userId}_${Date.now()}_${uuidv4().substring(0, 8)}`

            // Lấy lịch sử hội thoại (nếu có)
            const conversationHistory = await (this.prisma as any).userAIConversation.findMany({
                where: {
                    userId,
                    conversationId,
                    deletedAt: null
                },
                orderBy: {
                    createdAt: 'asc'
                },
                take: 20 // Lấy 20 messages gần nhất
            })

            // Xây dựng conversation context cho Gemini
            const history = conversationHistory.map(conv => ({
                role: conv.role === 'USER' ? 'user' : 'model',
                parts: [{ text: conv.message }]
            }))

            // Thêm message hiện tại của user
            history.push({
                role: 'user',
                parts: [{ text: userMessage }]
            })

            // Lấy config default theo mapping service ↔ config
            const svcCfg = await this.geminiConfigRepo.getDefaultConfigForService('AI_KAIWA' as any)
            const config: any = svcCfg?.geminiConfig || null
            const modelName = (config?.geminiConfigModel?.geminiModel?.key as string) || 'gemini-1.5-pro'

            // System prompt từ config hoặc default
            const systemPrompt = (config?.prompt as string) || `Bạn là một người bạn Nhật Bản thân thiện và nhiệt tình. Hãy trò chuyện tự nhiên bằng tiếng Nhật với người học. Hãy:
- Trả lời ngắn gọn, tự nhiên như đang trò chuyện với bạn
- Sử dụng ngôn ngữ phù hợp với trình độ người học
- Động viên và tạo động lực cho người học
- Đưa ra gợi ý về cách cải thiện nếu có lỗi
- Giữ cuộc trò chuyện vui vẻ và thú vị`

            // Gọi Gemini API - chọn API key dựa trên model
            const genAI = await this.getGenAIForModel(modelName)
            const model = genAI.getGenerativeModel({ model: modelName })

            // Tạo chat session với history
            const chat = model.startChat({
                history: history.slice(0, -1) as any, // Bỏ message cuối (message hiện tại)
                systemInstruction: systemPrompt
            })

            // Gửi message và nhận response
            const result = await chat.sendMessage(userMessage as any)
            const response = await result.response
            const aiResponse = response.text()

            if (!aiResponse || aiResponse.trim() === '') {
                throw new Error('Empty response from Gemini API')
            }

            // Lưu user message vào DB (lưu cả message gốc và transcription nếu có)
            const userMessageToSave = data.audioUrl && transcription
                ? `[Audio] ${transcription}`
                : userMessage

            await (this.prisma as any).userAIConversation.create({
                data: {
                    userId,
                    conversationId,
                    role: 'USER',
                    message: userMessageToSave
                }
            })

            // Lưu AI response vào DB (tạm thời chưa có audioUrl)
            const aiConversation = await (this.prisma as any).userAIConversation.create({
                data: {
                    userId,
                    conversationId,
                    role: 'AI',
                    message: aiResponse,
                    audioUrl: null
                }
            })

            let audioUrl: string | undefined = undefined

            // Convert to audio nếu includeAudio = true
            if (data.includeAudio !== false) {
                try {
                    const audioResult = await this.textToSpeechService.convertTextToSpeech(aiResponse, {
                        languageCode: 'ja-JP',
                        voiceName: 'ja-JP-Wavenet-A',
                        audioEncoding: 'MP3'
                    })

                    // Upload audio lên cloud (tạo file object tạm từ buffer)
                    const audioFile = {
                        buffer: audioResult.audioContent,
                        originalname: `ai-kaiwa-${aiConversation.id}.mp3`,
                        mimetype: 'audio/mpeg',
                        size: audioResult.audioContent.length
                    } as Express.Multer.File

                    const uploadResult = await this.uploadService.uploadFile(audioFile, 'ai-kaiwa')
                    audioUrl = uploadResult.url

                    // Update audioUrl trong DB
                    await (this.prisma as any).userAIConversation.update({
                        where: { id: aiConversation.id },
                        data: { audioUrl }
                    })

                    this.logger.log(`Generated audio for AI response: ${audioUrl}`)
                } catch (audioError) {
                    this.logger.warn('Failed to generate audio, continuing without audio:', audioError)
                    // Không throw error, chỉ log warning và tiếp tục
                }
            }

            this.logger.log(`AI Kaiwa completed for user ${userId}, conversationId: ${conversationId}`)

            return {
                conversationId,
                message: aiResponse,
                audioUrl,
                pronunciationAssessment,
                transcription
            }
        } catch (error) {
            this.logger.error('Error in AI Kaiwa:', error)
            if (error instanceof BadRequestException) {
                throw error
            }

            // Kiểm tra nếu là lỗi 403 Forbidden (API key issue)
            if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
                throw new BadRequestException('Lỗi xác thực API key. Vui lòng kiểm tra GEMINI_API_KEY trong file .env')
            }

            throw new BadRequestException('Không thể thực hiện hội thoại AI: ' + (error instanceof Error ? error.message : String(error)))
        }
    }

    /**
     * Chat với Gemini - API đơn giản chỉ text, không có audio/pronunciation assessment
     */
    async chatWithGemini(
        userId: number,
        data: ChatWithGeminiDto
    ): Promise<ChatWithGeminiResponse> {
        try {
            this.logger.log(`Chat with Gemini request from user ${userId}, conversationId: ${data.conversationId || 'new'}`)

            // Validate input
            if (!data.message || data.message.trim() === '') {
                throw new BadRequestException('Message không được để trống')
            }

            // Generate hoặc dùng conversationId có sẵn
            const conversationId = data.conversationId || `chat_${userId}_${Date.now()}_${uuidv4().substring(0, 8)}`

            // Lấy lịch sử hội thoại (nếu có và saveHistory = true)
            let history: any[] = []
            if (data.saveHistory !== false) {
                const conversationHistory = await (this.prisma as any).userAIConversation.findMany({
                    where: {
                        userId,
                        conversationId,
                        deletedAt: null
                    },
                    orderBy: {
                        createdAt: 'asc'
                    },
                    take: 20 // Lấy 20 messages gần nhất
                })

                // Xây dựng conversation context cho Gemini
                history = conversationHistory.map(conv => ({
                    role: conv.role === 'USER' ? 'user' : 'model',
                    parts: [{ text: conv.message }]
                }))
            }

            // Thêm message hiện tại của user
            history.push({
                role: 'user',
                parts: [{ text: data.message }]
            })

            // Chọn model - nếu là enum thì lấy value, nếu là string thì dùng trực tiếp
            let modelName: string
            if (!data.modelName) {
                modelName = 'gemini-2.5-pro'
            } else if (typeof data.modelName === 'string') {
                modelName = data.modelName
            } else {
                // Nếu là enum, lấy giá trị của enum
                modelName = data.modelName as string
            }
            this.logger.log(`Using model: ${modelName}`)

            // Gọi Gemini API - chọn API key dựa trên model
            const genAI = await this.getGenAIForModel(modelName)
            const model = genAI.getGenerativeModel({ model: modelName })

            // Tạo chat session với history
            const chat = model.startChat({
                history: history.slice(0, -1) as any, // Bỏ message cuối (message hiện tại)
            })

            // Gửi message và nhận response
            const result = await chat.sendMessage(data.message as any)
            const response = await result.response
            const aiResponse = response.text()

            if (!aiResponse || aiResponse.trim() === '') {
                throw new Error('Empty response from Gemini API')
            }

            // Lưu vào DB nếu saveHistory = true
            if (data.saveHistory !== false) {
                try {
                    // Lưu user message vào DB
                    await (this.prisma as any).userAIConversation.create({
                        data: {
                            userId,
                            conversationId,
                            role: 'USER',
                            message: data.message
                        }
                    })

                    // Lưu AI response vào DB
                    await (this.prisma as any).userAIConversation.create({
                        data: {
                            userId,
                            conversationId,
                            role: 'AI',
                            message: aiResponse
                        }
                    })
                } catch (dbError) {
                    this.logger.warn('Failed to save conversation history to DB:', dbError)
                    // Không throw error, chỉ log warning
                }
            }

            this.logger.log(`Chat with Gemini completed for user ${userId}, conversationId: ${conversationId}`)

            return {
                conversationId,
                message: aiResponse,
                modelUsed: modelName
            }
        } catch (error) {
            this.logger.error('Error in chat with Gemini:', error)
            if (error instanceof BadRequestException) {
                throw error
            }

            // Kiểm tra nếu là lỗi 403 Forbidden (API key issue)
            if (error && typeof error === 'object' && 'status' in error && error.status === 403) {
                throw new BadRequestException('Lỗi xác thực API key. Vui lòng kiểm tra GEMINI_API_KEY hoặc GEMINI_FLASH_API_KEY trong file .env')
            }

            throw new BadRequestException('Không thể chat với Gemini: ' + (error instanceof Error ? error.message : String(error)))
        }
    }

    /**
     * Replace placeholders trong prompt template
     */
    private replacePlaceholders(template: string, variables: Record<string, string>): string {
        let result = template
        for (const [key, value] of Object.entries(variables)) {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
        }
        return result
    }

    /**
     * Build prompt cho đánh giá SPEAKING (default)
     */
    private buildSpeakingEvaluationPrompt(text: string, transcription: string): string {
        return `Bạn là giáo viên tiếng Nhật chuyên nghiệp. Hãy đánh giá phát âm tiếng Nhật của học viên.

Câu cần phát âm: "${text}"
Transcription từ audio của học viên: "${transcription}"

Hãy đánh giá theo 4 tiêu chí (thang điểm 0-100):
1. Accuracy (Độ chính xác): Đánh giá mức độ chính xác về cách phát âm, ngữ điệu, trọng âm
2. Pronunciation (Phát âm): Đánh giá cách phát âm từng âm tiết, thanh điệu
3. Fluency (Độ trôi chảy): Đánh giá tốc độ nói, ngắt nghỉ tự nhiên
4. Overall Score (Điểm tổng): Điểm trung bình của 3 tiêu chí trên

Trả về JSON với format:
{
    "accuracy": <số từ 0-100>,
    "pronunciation": <số từ 0-100>,
    "fluency": <số từ 0-100>,
    "overallScore": <số từ 0-100>,
    "feedback": "<Nhận xét chi tiết bằng tiếng Việt>",
    "suggestions": ["<gợi ý 1>", "<gợi ý 2>", "<gợi ý 3>"]
}

Chỉ trả về JSON, không có text thừa.`
    }

    /**
     * Build prompt cho gợi ý cá nhân hóa
     */
    private buildRecommendationPrompt(analysis: any, limit: number): string {
        const { totalExerciseAttempts, totalTestAttempts, averageScore, weakAreas, strongAreas } = analysis

        return `Bạn là trợ lý AI chuyên về giáo dục tiếng Nhật. Dựa trên dữ liệu học tập của học viên, hãy đưa ra ${limit} gợi ý cá nhân hóa.

Thống kê học tập:
- Tổng số bài tập đã làm: ${totalExerciseAttempts}
- Tổng số bài test đã làm: ${totalTestAttempts}
- Điểm trung bình: ${averageScore.toFixed(1)}/100
- Điểm yếu: ${weakAreas.join(', ') || 'Chưa có dữ liệu'}
- Điểm mạnh: ${strongAreas.join(', ') || 'Chưa có dữ liệu'}

Hãy đưa ra gợi ý với các loại:
- exercise: Bài tập cần làm
- test: Bài test cần thử
- lesson: Bài học cần xem lại

Trả về JSON array với format:
[
    {
        "type": "exercise|test|lesson",
        "id": <ID của item>,
        "title": "<Tiêu đề>",
        "description": "<Mô tả ngắn>",
        "reason": "<Lý do tại sao gợi ý này phù hợp>",
        "priority": "high|medium|low"
    }
]

Chỉ trả về JSON array, không có text thừa. Sắp xếp theo priority từ cao xuống thấp.`
    }

    /**
     * Parse response từ Gemini cho đánh giá SPEAKING
     */
    private parseSpeakingEvaluationResponse(text: string): SpeakingEvaluationResponse {
        try {
            // Tìm JSON trong response (có thể có markdown code block)
            const jsonMatch = text.match(/\{[\s\S]*\}/)
            if (!jsonMatch) {
                throw new Error('Không tìm thấy JSON trong response')
            }

            const parsed = JSON.parse(jsonMatch[0])

            return {
                accuracy: Math.max(0, Math.min(100, parsed.accuracy || 0)),
                pronunciation: Math.max(0, Math.min(100, parsed.pronunciation || 0)),
                fluency: Math.max(0, Math.min(100, parsed.fluency || 0)),
                overallScore: Math.max(0, Math.min(100, parsed.overallScore || 0)),
                feedback: parsed.feedback || 'Chưa có nhận xét',
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : []
            }
        } catch (error) {
            this.logger.error('Error parsing speaking evaluation response:', error)
            // Trả về response mặc định nếu parse lỗi
            return {
                accuracy: 50,
                pronunciation: 50,
                fluency: 50,
                overallScore: 50,
                feedback: 'Không thể phân tích chi tiết. Vui lòng thử lại.',
                suggestions: ['Luyện tập phát âm thường xuyên hơn']
            }
        }
    }

    /**
     * Parse response từ Gemini cho gợi ý
     */
    private parseRecommendationsResponse(text: string, analysis: any): any[] {
        try {
            // Tìm JSON array trong response
            const jsonMatch = text.match(/\[[\s\S]*\]/)
            if (!jsonMatch) {
                throw new Error('Không tìm thấy JSON array trong response')
            }

            const parsed = JSON.parse(jsonMatch[0])

            if (!Array.isArray(parsed)) {
                throw new Error('Response không phải là array')
            }

            // Parse format mới: contentType, contentId (cho SRS), message khuyến nghị
            return parsed.map(item => ({
                contentType: item.contentType || 'VOCABULARY', // VOCABULARY | GRAMMAR | KANJI
                contentId: Number(item.contentId) || 0,
                reason: item.reason || '',
                message: item.message || '',
                priority: item.priority || 'medium'
            }))
        } catch (error) {
            this.logger.error('Error parsing recommendations response:', error)
            return []
        }
    }

    /**
     * Phân tích hiệu suất học tập của user
     */
    private analyzeUserPerformance(exerciseAttempts: any[], testAttempts: any[]) {
        // Tính toán điểm trung bình
        let totalScore = 0
        let count = 0

        // Từ exercise attempts
        exerciseAttempts.forEach(attempt => {
            if (attempt.userAnswerLogs && attempt.userAnswerLogs.length > 0) {
                const correctCount = attempt.userAnswerLogs.filter((log: any) => log.isCorrect).length
                const score = (correctCount / attempt.userAnswerLogs.length) * 100
                totalScore += score
                count++
            }
        })

        // Từ test attempts
        testAttempts.forEach(attempt => {
            if (attempt.score !== null && attempt.score !== undefined) {
                totalScore += attempt.score
                count++
            }
        })

        const averageScore = count > 0 ? totalScore / count : 0

        // Phân tích điểm yếu và điểm mạnh dựa trên questionType
        const questionTypeStats: { [key: string]: { correct: number; total: number } } = {}

        exerciseAttempts.forEach(attempt => {
            attempt.userAnswerLogs?.forEach((log: any) => {
                const type = log.questionBank?.questionType || 'UNKNOWN'
                if (!questionTypeStats[type]) {
                    questionTypeStats[type] = { correct: 0, total: 0 }
                }
                questionTypeStats[type].total++
                if (log.isCorrect) {
                    questionTypeStats[type].correct++
                }
            })
        })

        testAttempts.forEach(attempt => {
            attempt.userTestAnswerLogs?.forEach((log: any) => {
                const type = log.questionBank?.questionType || 'UNKNOWN'
                if (!questionTypeStats[type]) {
                    questionTypeStats[type] = { correct: 0, total: 0 }
                }
                questionTypeStats[type].total++
                if (log.isCorrect) {
                    questionTypeStats[type].correct++
                }
            })
        })

        // Xác định điểm yếu (tỷ lệ đúng < 60%) và điểm mạnh (> 80%)
        const weakAreas: string[] = []
        const strongAreas: string[] = []

        Object.entries(questionTypeStats).forEach(([type, stats]) => {
            if (stats.total >= 5) { // Chỉ tính nếu có ít nhất 5 câu
                const accuracy = (stats.correct / stats.total) * 100
                if (accuracy < 60) {
                    weakAreas.push(type)
                } else if (accuracy > 80) {
                    strongAreas.push(type)
                }
            }
        })

        return {
            totalExerciseAttempts: exerciseAttempts.length,
            totalTestAttempts: testAttempts.length,
            averageScore,
            weakAreas,
            strongAreas
        }
    }
}
