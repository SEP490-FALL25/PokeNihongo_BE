import {
    CreateUserExerciseAttemptBodyType,
    GetUserExerciseAttemptByIdParamsType,
    GetUserExerciseAttemptListQueryType,
    UpdateUserExerciseAttemptBodyType,
    LatestExerciseAttemptsByLessonResType
} from '@/modules/user-exercise-attempt/entities/user-exercise-attempt.entities'
import {
    InvalidUserExerciseAttemptDataException,
    UserExerciseAttemptNotFoundException,
    ExerciseNotFoundException,
    LessonBlockedException
} from '@/modules/user-exercise-attempt/dto/user-exercise-attempt.error'
import { EXERCISES_MESSAGE, USER_EXERCISE_ATTEMPT_MESSAGE } from '@/common/constants/message'
import { UserExerciseAttemptRepository } from '@/modules/user-exercise-attempt/user-exercise-attempt.repo'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { UserAnswerLogService } from '@/modules/user-answer-log/user-answer-log.service'
import { UserProgressService } from '@/modules/user-progress/user-progress.service'
import { ExercisesService } from '@/modules/exercises/exercises.service'
import { isNotFoundPrismaError } from '@/shared/helpers'
import { Injectable, Logger, HttpException } from '@nestjs/common'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'

@Injectable()
export class UserExerciseAttemptService {
    private readonly logger = new Logger(UserExerciseAttemptService.name)

    constructor(
        private readonly userExerciseAttemptRepository: UserExerciseAttemptRepository,
        private readonly questionBankService: QuestionBankService,
        private readonly userAnswerLogService: UserAnswerLogService,
        private readonly userProgressService: UserProgressService,
        private readonly exercisesService: ExercisesService,
        private readonly translationHelper: TranslationHelperService
    ) { }

    async create(userId: number, exerciseId: number) {
        try {
            // 1. Lấy thông tin Exercise để biết lessonId
            const exercise = await this.exercisesService.findById(exerciseId)
            if (!exercise) {
                throw ExerciseNotFoundException
            }

            const targetLessonId = exercise.lessonId

            // 2. Kiểm tra xem user có đang có lesson IN_PROGRESS không
            const currentInProgressLesson = await this.userProgressService.getCurrentInProgressLesson(userId)
            if (currentInProgressLesson) {
                // 3. Nếu có lesson IN_PROGRESS, kiểm tra xem có phải lesson target không
                if (currentInProgressLesson.lessonId !== targetLessonId) {
                    // 4. Nếu không phải lesson target, kiểm tra xem lesson target có COMPLETED không
                    const targetLessonProgress = await this.userProgressService.getUserProgressByLesson(userId, targetLessonId)
                    if (!targetLessonProgress || targetLessonProgress.status !== 'COMPLETED') {
                        throw LessonBlockedException
                    }
                    // Nếu lesson target đã COMPLETED, cho phép tạo attempt
                }
            }

            const userExerciseAttempt = await this.userExerciseAttemptRepository.create({
                userId: userId,
                exerciseId: exerciseId
            })

            // Cập nhật UserProgress status thành IN_PROGRESS khi bắt đầu làm bài tập
            await this.updateUserProgressOnStart(userId, exerciseId)

            return {
                data: userExerciseAttempt,
                message: USER_EXERCISE_ATTEMPT_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating user exercise attempt:', error)
            if (error instanceof HttpException) {
                throw error
            }
            throw InvalidUserExerciseAttemptDataException
        }
    }

    async findAll(query: GetUserExerciseAttemptListQueryType) {
        const { currentPage, pageSize, userId, exerciseId, status } = query

        const result = await this.userExerciseAttemptRepository.findMany({
            currentPage,
            pageSize,
            userId,
            exerciseId,
            status
        })

        return {
            statusCode: 200,
            message: USER_EXERCISE_ATTEMPT_MESSAGE.GET_LIST_SUCCESS,
            data: {
                results: result.items,
                pagination: {
                    current: result.page,
                    pageSize: result.limit,
                    totalPage: Math.ceil(result.total / result.limit),
                    totalItem: result.total
                }
            }
        }
    }

    async findOne(id: number) {
        const userExerciseAttempt = await this.userExerciseAttemptRepository.findUnique({
            id: id
        })

        if (!userExerciseAttempt) {
            throw UserExerciseAttemptNotFoundException
        }

        return {
            data: userExerciseAttempt,
            message: USER_EXERCISE_ATTEMPT_MESSAGE.GET_SUCCESS
        }
    }

    async update(id: number, body: UpdateUserExerciseAttemptBodyType) {
        try {
            const userExerciseAttempt = await this.userExerciseAttemptRepository.update({ id }, body)

            return {
                data: userExerciseAttempt,
                message: USER_EXERCISE_ATTEMPT_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error updating user exercise attempt:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại') || error.message?.includes('đã tồn tại')) {
                throw error
            }
            throw InvalidUserExerciseAttemptDataException
        }
    }

    async remove(id: number) {
        try {
            const userExerciseAttempt = await this.userExerciseAttemptRepository.delete({ id })

            return {
                data: userExerciseAttempt,
                message: USER_EXERCISE_ATTEMPT_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error deleting user exercise attempt:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidUserExerciseAttemptDataException
        }
    }

    async checkExerciseCompletion(userExerciseAttemptId: number, userId: number, timeSeconds?: number) {
        try {
            this.logger.log(`Checking completion for user exercise attempt: ${userExerciseAttemptId}`)

            // 1. Lấy thông tin UserExerciseAttempt
            const attempt = await this.userExerciseAttemptRepository.findById(userExerciseAttemptId)
            if (!attempt) {
                throw UserExerciseAttemptNotFoundException
            }

            // 2. Lấy thông tin Exercise để biết testSetId
            const exercise = await this.exercisesService.findById(attempt.exerciseId)
            if (!exercise || !exercise.testSetId) {
                throw new Error('Exercise không có test set')
            }

            // 3. Lấy tất cả Question của TestSet
            const questionsResult = await this.questionBankService.findByTestSetId(exercise.testSetId)
            const allQuestions = questionsResult.data.results
            this.logger.log(`Found ${allQuestions.length} questions for exercise ${attempt.exerciseId}`)

            // 4. Lấy tất cả UserAnswerLog của attempt này
            const answerLogsResult = await this.userAnswerLogService.findByUserExerciseAttemptId(userExerciseAttemptId)
            const userAnswers = answerLogsResult.data.results
            this.logger.log(`Found ${userAnswers.length} user answers for attempt ${userExerciseAttemptId}`)

            // 5. Kiểm tra xem đã trả lời hết chưa
            const answeredQuestionIds = new Set(userAnswers.map(log => log.questionId))
            const unansweredQuestions = allQuestions.filter(q => !answeredQuestionIds.has(q.id))
            if (unansweredQuestions.length > 0) {
                this.logger.log(`Still ${unansweredQuestions.length} unanswered questions`)
                return {
                    statusCode: 200,
                    message: 'Bạn chưa trả lời đủ câu hỏi',
                    data: {
                        isCompleted: false,
                        totalQuestions: allQuestions.length,
                        answeredQuestions: userAnswers.length,
                        unansweredQuestions: unansweredQuestions.length,
                        unansweredQuestionIds: unansweredQuestions.map(q => q.id),
                        allCorrect: false,
                        status: 'IN_PROGRESS'
                    }
                }
            }

            // 6. Kiểm tra xem tất cả câu trả lời có đúng không
            const allCorrect = userAnswers.every(log => log.isCorrect)

            // 7. Update status dựa trên kết quả
            let newStatus: string
            let message: string

            if (allCorrect) {
                newStatus = 'COMPLETED'
                message = 'Chúc mừng! Bạn đã hoàn thành bài tập và trả lời đúng hết'
            } else {
                newStatus = 'FAIL'
                message = 'Bạn đã hoàn thành bài tập nhưng có một số câu trả lời sai'
            }

            // Update status trong database
            await this.userExerciseAttemptRepository.update(
                { id: userExerciseAttemptId },
                { status: newStatus, ...(timeSeconds !== undefined ? { time: timeSeconds } : {}) }
            )
            this.logger.log(`Updated attempt ${userExerciseAttemptId} to ${newStatus}`)

            // Nếu status là COMPLETED, cập nhật UserProgress
            if (newStatus === 'COMPLETED') {
                await this.updateUserProgressOnCompletion(attempt.userId, attempt.exerciseId)
            }

            return {
                statusCode: 200,
                message: message,
                data: {
                    isCompleted: true,
                    totalQuestions: allQuestions.length,
                    answeredQuestions: userAnswers.length,
                    unansweredQuestions: 0,
                    allCorrect: allCorrect,
                    status: newStatus
                }
            }

        } catch (error) {
            this.logger.error('Error checking exercise completion:', error)
            throw error
        }
    }

    async abandon(userExerciseAttemptId: number, userId: number) {
        try {
            this.logger.log(`Abandoning user exercise attempt: ${userExerciseAttemptId} for user: ${userId}`)

            // 1. Lấy thông tin UserExerciseAttempt
            const attempt = await this.userExerciseAttemptRepository.findById(userExerciseAttemptId)
            if (!attempt) {
                throw UserExerciseAttemptNotFoundException
            }

            // 2. Kiểm tra xem attempt có thuộc về user này không
            if (attempt.userId !== userId) {
                throw new Error('Unauthorized: This attempt does not belong to you')
            }

            // 3. Kiểm tra xem attempt có đang IN_PROGRESS không
            if (attempt.status !== 'IN_PROGRESS') {
                return {
                    statusCode: 400,
                    message: 'Chỉ có thể bỏ dở bài tập đang trong trạng thái IN_PROGRESS',
                    data: attempt
                }
            }

            // 4. Update status thành ABANDONED
            const updatedAttempt = await this.userExerciseAttemptRepository.update(
                { id: userExerciseAttemptId },
                { status: 'ABANDONED' }
            )

            this.logger.log(`Updated attempt ${userExerciseAttemptId} to ABANDONED`)

            return {
                statusCode: 200,
                message: 'Đã đánh dấu bài tập là bỏ dở',
                data: updatedAttempt
            }

        } catch (error) {
            this.logger.error('Error abandoning exercise attempt:', error)
            throw error
        }
    }

    async getStatus(userExerciseAttemptId: number, userId: number) {
        try {
            this.logger.log(`Getting status for user exercise attempt: ${userExerciseAttemptId} for user: ${userId}`)

            // 1. Lấy thông tin UserExerciseAttempt
            const attempt = await this.userExerciseAttemptRepository.findById(userExerciseAttemptId)
            if (!attempt) {
                throw UserExerciseAttemptNotFoundException
            }

            // 2. Kiểm tra xem attempt có thuộc về user này không
            if (attempt.userId !== userId) {
                throw new Error('Unauthorized: This attempt does not belong to you')
            }

            return {
                statusCode: 200,
                message: 'Lấy trạng thái bài tập thành công',
                data: attempt
            }

        } catch (error) {
            this.logger.error('Error getting exercise attempt status:', error)
            throw error
        }
    }

    private async updateUserProgressOnCompletion(userId: number, exerciseId: number) {
        try {
            this.logger.log(`Updating user progress for completed exercise: ${exerciseId} for user: ${userId}`)

            // 1. Lấy thông tin Exercise để biết lessonId
            const exercise = await this.exercisesService.findById(exerciseId)
            if (!exercise) {
                this.logger.warn(`Exercise ${exerciseId} not found`)
                return
            }

            const lessonId = exercise.lessonId
            this.logger.log(`Exercise ${exerciseId} belongs to lesson ${lessonId}`)

            // 2. Lấy tất cả exercises của lesson này
            const lessonExercises = await this.exercisesService.findByLessonId(lessonId)
            const totalExercises = lessonExercises.length
            this.logger.log(`Lesson ${lessonId} has ${totalExercises} exercises`)

            // 3. Đếm số exercises đã COMPLETED của user trong lesson này
            const completedExercises = await this.userExerciseAttemptRepository.findCompletedExercisesByLesson(userId, lessonId)
            const completedCount = completedExercises.length
            this.logger.log(`User ${userId} has completed ${completedCount}/${totalExercises} exercises in lesson ${lessonId}`)

            // 4. Tính phần trăm hoàn thành
            const progressPercentage = Math.round((completedCount / totalExercises) * 100)
            this.logger.log(`Calculated progress percentage: ${progressPercentage}%`)

            // 5. Cập nhật UserProgress
            await this.userProgressService.updateProgressByLesson(userId, lessonId, progressPercentage)

            this.logger.log(`Updated user progress for lesson ${lessonId}: ${progressPercentage}%`)

        } catch (error) {
            this.logger.error('Error updating user progress on completion:', error)
            // Không throw error để không ảnh hưởng đến flow chính
        }
    }

    private async updateUserProgressOnStart(userId: number, exerciseId: number) {
        try {
            this.logger.log(`Updating user progress on start for exercise: ${exerciseId} for user: ${userId}`)

            // 1. Lấy thông tin Exercise để biết lessonId
            const exercise = await this.exercisesService.findById(exerciseId)
            if (!exercise) {
                this.logger.warn(`Exercise ${exerciseId} not found`)
                return
            }

            const lessonId = exercise.lessonId
            this.logger.log(`Exercise ${exerciseId} belongs to lesson ${lessonId}`)

            // 2. Cập nhật UserProgress status thành IN_PROGRESS
            await this.userProgressService.updateProgressByLesson(userId, lessonId, 0, 'IN_PROGRESS')

            this.logger.log(`Updated UserProgress for user ${userId}, lesson ${lessonId} to IN_PROGRESS`)

        } catch (error) {
            this.logger.error('Error updating user progress on start:', error)
            // Không throw error để không ảnh hưởng đến flow chính
        }
    }

    async getLatestExerciseAttemptsByLesson(userId: number, lessonId: number): Promise<LatestExerciseAttemptsByLessonResType> {
        try {
            this.logger.log(`Getting latest exercise attempts for user ${userId} in lesson ${lessonId}`)

            const result = await this.userExerciseAttemptRepository.findLatestByLessonAndUser(userId, lessonId)

            this.logger.log(`Found ${result.length} exercise attempts (including newly created ones)`)

            // Log chi tiết về status
            const completedCount = result.filter(attempt => attempt.status === 'COMPLETED').length
            const inProgressCount = result.filter(attempt => attempt.status === 'IN_PROGRESS').length
            const otherCount = result.length - completedCount - inProgressCount

            this.logger.log(`Status breakdown: ${completedCount} COMPLETED, ${inProgressCount} IN_PROGRESS, ${otherCount} others`)

            return {
                statusCode: 200,
                data: result,
                message: 'Lấy danh sách exercise gần nhất thành công'
            }
        } catch (error) {
            this.logger.error('Error getting latest exercise attempts by lesson:', error)
            throw error
        }
    }

    async getExerciseAttemptByExerciseId(id: number, userId: number, languageCode: string): Promise<MessageResDTO | null> {
        try {

            const userExerciseAttempt = await this.findOne(id)
            const result = await this.exercisesService.getExercisesByIdHaveQuestionBanks(userExerciseAttempt.data.exerciseId)
            // Map translations: question strictly from translation; answers from translation or parsed composite string
            const testSet = (result.data as any)?.testSet
            const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'
            const pickByLang = (raw: string, lang: string): string => {
                if (!raw) return ''
                // format example: "jp:月 + vi:Tháng + en:Month"
                const parts = raw.split('+').map(p => p.trim())
                const map: Record<string, string> = {}
                for (const part of parts) {
                    const idx = part.indexOf(':')
                    if (idx > -1) {
                        const k = part.slice(0, idx).trim()
                        const v = part.slice(idx + 1).trim()
                        if (k) map[k] = v
                    }
                }
                // If no labeled segments detected, treat entire raw as JP text or first token before '+'
                if (Object.keys(map).length === 0) {
                    const first = raw.split('+')[0]?.trim() ?? ''
                    return first
                }
                // prefer requested lang, fallback jp, else original raw without prefixes
                if (map[lang]) return map[lang]
                if (map['vi'] && lang.startsWith('vi')) return map['vi']
                if (map['en'] && lang.startsWith('en')) return map['en']
                return map['jp'] ?? raw.replace(/\b(jp|vi|en)\s*:/g, '').trim()
            }

            if (testSet?.testSetQuestionBanks?.length) {
                const mappedBanks = await Promise.all(
                    testSet.testSetQuestionBanks.map(async (item: any) => {
                        const qb = item.questionBank
                        // Question: only via translation key; if missing translation, return empty string
                        let questionText = ''
                        if (qb?.questionKey) {
                            const triedLang = normalizedLang
                            const keyCandidates = [
                                qb.questionKey,
                                qb.questionKey.endsWith('.meaning.1') ? qb.questionKey : `${qb.questionKey}.meaning.1`,
                                qb.questionKey.endsWith('.question') ? qb.questionKey : `${qb.questionKey}.question`
                            ]
                            for (const key of keyCandidates) {
                                questionText = (await this.translationHelper.getTranslation(key, triedLang)) || ''
                                if (!questionText) {
                                    questionText = (await this.translationHelper.getTranslation(key, 'vi')) || ''
                                }
                                if (questionText) break
                            }
                        }
                        if (!questionText) {
                            // fallback to JP original if translation is missing
                            questionText = qb?.questionJp || ''
                        }

                        const mappedAnswers = await Promise.all(
                            (qb?.answers || []).map(async (ans: any) => {
                                // Always derive from answerJp composite string based on language
                                const answerLabel = pickByLang(ans?.answerJp || '', normalizedLang)
                                return {
                                    id: ans.id,
                                    answer: answerLabel
                                }
                            })
                        )

                        return {
                            id: item.id,
                            questionOrder: item.questionOrder,
                            questionBank: {
                                id: qb?.id,
                                question: questionText,
                                answers: mappedAnswers
                            }
                        }
                    })
                )

                result.data = {
                    id: (result.data as any).id,
                    exerciseType: (result.data as any).exerciseType,
                    isBlocked: (result.data as any).isBlocked,
                    testSetId: (result.data as any).testSetId,
                    testSet: {
                        id: testSet.id,
                        testSetQuestionBanks: mappedBanks
                    }
                } as any
            }

            this.logger.log(`Getting latest exercise attempts for user ${userId} in exercise ${userExerciseAttempt.data.exerciseId}`)

            let userExerciseAttemptId = 0;
            const checkAttempt = await this.getStatus(id, userId)
            if (checkAttempt.data.status === 'COMPLETED') {
                const createAttempt = await this.create(userId, result.data.id)
                userExerciseAttemptId = createAttempt.data.id
            }

            return {
                statusCode: 200,
                data: {
                    ...result.data,
                    userExerciseAttemptId
                },
                message: EXERCISES_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error getting latest exercise attempts by lesson:', error)
            throw error
        }
    }
}