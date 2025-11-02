import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { PrismaService } from '@/shared/services/prisma.service'
import { EvaluateSpeakingDto } from './dto/gemini.dto'
import { SpeakingEvaluationResponse, PersonalizedRecommendationsResponse } from './dto/gemini.response.dto'

@Injectable()
export class GeminiService {
    private readonly logger = new Logger(GeminiService.name)
    private readonly genAI: GoogleGenerativeAI
    private readonly modelName: string = 'gemini-1.5-pro'

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService
    ) {
        const apiKey = this.configService.get<string>('gemini.apiKey')
        if (!apiKey || apiKey.trim() === '') {
            this.logger.error('GEMINI_API_KEY not found or empty in environment variables. Please set GEMINI_API_KEY in your .env file')
            throw new Error('GEMINI_API_KEY is required but not configured')
        }

        // Log một phần API key để debug (chỉ log 8 ký tự đầu và cuối)
        const maskedKey = apiKey.length > 16
            ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 8)}`
            : '***'
        this.logger.log(`Gemini AI initializing with API key: ${maskedKey}`)

        this.genAI = new GoogleGenerativeAI(apiKey)
        this.logger.log('Gemini AI initialized successfully')
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

            // Prompt cho Gemini để đánh giá phát âm
            const prompt = this.buildSpeakingEvaluationPrompt(data.text, data.transcription || data.text)

            // Gọi Gemini API
            const model = this.genAI.getGenerativeModel({ model: this.modelName })
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
        limit: number = 10
    ): Promise<PersonalizedRecommendationsResponse> {
        try {
            this.logger.log(`Getting personalized recommendations for user ${userId}`)

            // Lấy dữ liệu từ userExerciseAttempt
            const exerciseAttempts = await this.prisma.userExerciseAttempt.findMany({
                where: { userId },
                include: {
                    exercise: {
                        include: {
                            lesson: true
                        }
                    },
                    userAnswerLogs: {
                        include: {
                            questionBank: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 50 // Lấy 50 attempt gần nhất để phân tích
            })

            // Lấy dữ liệu từ userTestAttempt
            const testAttempts = await this.prisma.userTestAttempt.findMany({
                where: { userId },
                include: {
                    test: true,
                    userTestAnswerLogs: {
                        include: {
                            questionBank: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                take: 20 // Lấy 20 test attempt gần nhất
            })

            // Phân tích dữ liệu để tìm điểm yếu và điểm mạnh
            const analysis = this.analyzeUserPerformance(exerciseAttempts, testAttempts)

            // Tạo prompt cho Gemini để đưa ra gợi ý
            const prompt = this.buildRecommendationPrompt(analysis, limit)

            // Gọi Gemini API
            const model = this.genAI.getGenerativeModel({ model: this.modelName })
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
            const recommendations = this.parseRecommendationsResponse(text, analysis)

            return {
                recommendations: recommendations.slice(0, limit),
                summary: analysis
            }
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
     * Build prompt cho đánh giá SPEAKING
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

            return parsed.map(item => ({
                type: item.type || 'exercise',
                id: item.id || 0,
                title: item.title || 'Không có tiêu đề',
                description: item.description || '',
                reason: item.reason || '',
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
