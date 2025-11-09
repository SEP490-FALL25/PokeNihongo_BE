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
    LessonBlockedException,
    ForbiddenReviewAccessException,
    LessonPrerequisiteNotMetException
} from '@/modules/user-exercise-attempt/dto/user-exercise-attempt.error'
import { EXERCISES_MESSAGE, USER_EXERCISE_ATTEMPT_MESSAGE } from '@/common/constants/message'
import { UserExerciseAttemptRepository } from '@/modules/user-exercise-attempt/user-exercise-attempt.repo'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { UserAnswerLogService } from '@/modules/user-answer-log/user-answer-log.service'
import { UserProgressService } from '@/modules/user-progress/user-progress.service'
import { ExercisesService } from '@/modules/exercises/exercises.service'
import { isNotFoundPrismaError } from '@/shared/helpers'
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'
import { I18nService } from '@/i18n/i18n.service'
import { UserExerciseAttemptMessage } from '@/i18n/message-keys'
import { pickLabelFromComposite } from '@/common/utils/prase.utils'

@Injectable()
export class UserExerciseAttemptService {
    private readonly logger = new Logger(UserExerciseAttemptService.name)

    constructor(
        private readonly userExerciseAttemptRepository: UserExerciseAttemptRepository,
        private readonly questionBankService: QuestionBankService,
        private readonly userAnswerLogService: UserAnswerLogService,
        private readonly userProgressService: UserProgressService,
        private readonly exercisesService: ExercisesService,
        private readonly translationHelper: TranslationHelperService,
        private readonly i18nService: I18nService
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

    async checkExerciseCompletion(userExerciseAttemptId: number, userId: number) {
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
            const answeredQuestionIds = new Set(userAnswers.map(log => (log as any).questionBankId))
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

            // 7. Chỉ trả kết quả, KHÔNG cập nhật DB trong hàm check
            const finalStatus = allCorrect ? 'COMPLETED' : 'FAIL'
            const message = allCorrect
                ? 'Chúc mừng! Bạn đã hoàn thành bài tập và trả lời đúng hết'
                : 'Bạn đã hoàn thành bài tập nhưng có một số câu trả lời sai'

            return {
                statusCode: 200,
                message: message,
                data: {
                    isCompleted: true,
                    totalQuestions: allQuestions.length,
                    answeredQuestions: userAnswers.length,
                    unansweredQuestions: 0,
                    allCorrect: allCorrect,
                    status: finalStatus
                }
            }

        } catch (error) {
            this.logger.error('Error checking exercise completion:', error)
            throw error
        }
    }

    async supmitExerciseCompletion(userExerciseAttemptId: number, userId: number, timeSeconds?: number) {
        // 3,14159 PILU
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
            const answeredQuestionIds = new Set(userAnswers.map(log => (log as any).questionBankId))
            const unansweredQuestions = allQuestions.filter(q => !answeredQuestionIds.has(q.id))

            // Nếu không có câu trả lời nào mà vẫn nộp bài, coi như FAIL
            if (userAnswers.length === 0) {
                const newStatus = 'FAIL'
                const message = 'Bạn đã nộp bài nhưng chưa trả lời câu hỏi nào'

                await this.userExerciseAttemptRepository.update(
                    { id: userExerciseAttemptId },
                    { status: newStatus, ...(timeSeconds !== undefined ? { time: timeSeconds } : {}) }
                )
                this.logger.log(`Updated attempt ${userExerciseAttemptId} to ${newStatus} - no answers provided`)

                return {
                    statusCode: 200,
                    message: message,
                    data: {
                        isCompleted: true,
                        totalQuestions: allQuestions.length,
                        answeredQuestions: 0,
                        unansweredQuestions: allQuestions.length,
                        unansweredQuestionIds: allQuestions.map(q => q.id),
                        allCorrect: false,
                        status: newStatus
                    }
                }
            }

            // Nếu chưa trả lời hết, coi như FAIL
            if (unansweredQuestions.length > 0) {
                const newStatus = 'FAIL'
                const message = 'Bạn đã nộp bài nhưng chưa trả lời đủ câu hỏi'

                await this.userExerciseAttemptRepository.update(
                    { id: userExerciseAttemptId },
                    { status: newStatus, ...(timeSeconds !== undefined ? { time: timeSeconds } : {}) }
                )
                this.logger.log(`Updated attempt ${userExerciseAttemptId} to ${newStatus} - incomplete answers`)

                return {
                    statusCode: 200,
                    message: message,
                    data: {
                        isCompleted: true,
                        totalQuestions: allQuestions.length,
                        answeredQuestions: userAnswers.length,
                        unansweredQuestions: unansweredQuestions.length,
                        unansweredQuestionIds: unansweredQuestions.map(q => q.id),
                        allCorrect: false,
                        status: newStatus
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
            //CON cá PILU

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

    async abandon(userExerciseAttemptId: number, userId: number, timeSeconds?: number) {
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
                { status: 'ABANDONED', ...(timeSeconds !== undefined ? { time: timeSeconds } : {}) }
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

    async getStatusExcericeAttemptLatest(userExerciseAttemptId: number, userId: number) {
        try {
            this.logger.log(`Get latest attempt status by base attempt ${userExerciseAttemptId} for user ${userId}`)

            // 1) Lấy attempt hiện tại để biết exerciseId
            const baseAttempt = await this.userExerciseAttemptRepository.findById(userExerciseAttemptId)
            if (!baseAttempt) {
                throw UserExerciseAttemptNotFoundException
            }

            // 2) Lấy attempt mới nhất của user cho exercise này
            const latestAttempt = await this.userExerciseAttemptRepository.findLatestByUserAndExercise(
                userId,
                baseAttempt.exerciseId
            )

            return {
                statusCode: 200,
                message: 'Lấy trạng thái bài tập thành công',
                data: latestAttempt ?? baseAttempt
            }

        } catch (error) {
            this.logger.error('Error getting exercise attempt status:', error)
            throw error
        }
    }

    async getLatestExerciseAttemptsByLesson(userId: number, lessonId: number): Promise<LatestExerciseAttemptsByLessonResType> {
        try {
            this.logger.log(`Getting latest exercise attempts for user ${userId} in lesson ${lessonId}`)

            //check xem user progress có status NOT_STARTED không để chặn nhảy cóc
            const checkUserProgress = await this.userProgressService.findByUserAndLesson(userId, lessonId)
            if (checkUserProgress.data.status === 'NOT_STARTED') {
                const previousLessonId = await this.userProgressService.getPreviousLessonId(lessonId)
                this.logger.log(`Previous lesson id: ${previousLessonId} for user ${userId}`)
                if (previousLessonId) {
                    const prevProgress = await this.userProgressService.getUserProgressByLesson(userId, previousLessonId)
                    // Chặn nhảy cóc: nếu bài ngay trước đó vẫn NOT_STARTED thì không cho vào bài hiện tại
                    if (prevProgress && prevProgress.status === 'NOT_STARTED') {
                        this.logger.warn(`Blocked: previous lesson ${previousLessonId} is NOT_STARTED. Cannot open lesson ${lessonId}.`)
                        throw LessonPrerequisiteNotMetException(previousLessonId, lessonId)
                    }
                }
            }

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
            // Giữ nguyên HttpException (ví dụ: LessonPrerequisiteNotMetException) để controller trả đúng status/message
            if (error instanceof HttpException) {
                throw error
            }
            // Fallback: gói về 500 nếu là lỗi không xác định
            throw new HttpException(
                {
                    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                    message: 'Không thể lấy danh sách exercise gần nhất',
                    error: 'INTERNAL_SERVER_ERROR'
                },
                HttpStatus.INTERNAL_SERVER_ERROR
            )
        }
    }

    async getExerciseAttemptByExerciseId(id: number, userId: number, languageCode: string): Promise<MessageResDTO | null> {
        try {
            // Lấy attempt base để biết exerciseId
            const baseAttemptRes = await this.findOne(id)
            const baseAttempt = baseAttemptRes.data as any

            // Kiểm tra attempt có thuộc về user này không
            if (baseAttempt?.userId !== userId) {
                throw ForbiddenReviewAccessException
            }

            const exerciseId = baseAttempt.exerciseId

            // Tìm attempt gần nhất theo thứ tự ưu tiên: IN_PROGRESS > ABANDONED > SKIPPED > COMPLETED/FAIL
            const latestAttempt = await this.userExerciseAttemptRepository.findLatestByPriority(userId, exerciseId)

            if (!latestAttempt) {
                throw UserExerciseAttemptNotFoundException
            }

            // Nếu attempt gần nhất là SKIPPED, COMPLETED hoặc FAIL → tạo attempt mới hoàn toàn
            let attempt = latestAttempt
            let userExerciseAttemptId = latestAttempt.id
            let shouldLoadOldAnswers = false // Chỉ load answers cũ nếu là ABANDONED

            if (latestAttempt.status === 'NOT_STARTED') {
                // Nếu là NOT_STARTED, update thành IN_PROGRESS
                this.logger.log(`Latest attempt is NOT_STARTED, updating to IN_PROGRESS for user ${userId}, exercise ${exerciseId}`)
                const updatedAttempt = await this.userExerciseAttemptRepository.update(
                    { id: latestAttempt.id },
                    { status: 'IN_PROGRESS' }
                )
                attempt = updatedAttempt as any
                userExerciseAttemptId = attempt.id
                shouldLoadOldAnswers = false
            } else if (latestAttempt.status === 'SKIPPED' || latestAttempt.status === 'COMPLETED' || latestAttempt.status === 'FAIL') {
                this.logger.log(`Latest attempt is ${latestAttempt.status}, creating new attempt for user ${userId}, exercise ${exerciseId}`)
                const createAttempt = await this.create(userId, exerciseId)
                attempt = createAttempt.data as any
                userExerciseAttemptId = attempt.id
                // Khi tạo mới từ SKIPPED/COMPLETED/FAIL, không load answers cũ
                shouldLoadOldAnswers = false
            } else if (latestAttempt.status === 'ABANDONED') {
                // Nếu là ABANDONED, load answers cũ để khôi phục
                shouldLoadOldAnswers = true
            }

            const result = await this.exercisesService.getExercisesByIdHaveQuestionBanks(exerciseId)
            // Map translations: question strictly from translation; answers from translation or parsed composite string
            const testSet = (result.data as any)?.testSet
            const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'
            // Load user answer logs chỉ nếu cần khôi phục (ABANDONED)
            let selectedAnswerIds = new Set<number>()
            let answeredCount = 0
            if (shouldLoadOldAnswers) {
                try {
                    const logsRes = await this.userAnswerLogService.findByUserExerciseAttemptId(userExerciseAttemptId)
                    const logs = (logsRes?.data?.results || []) as any[]
                    answeredCount = logs.length
                    // Chỉ mark choices nếu là ABANDONED (để khôi phục)
                    if (attempt?.status === 'ABANDONED') {
                        const ids = logs.map((log: any) => log.answerId).filter((v: any) => typeof v === 'number')
                        selectedAnswerIds = new Set<number>(ids)
                    }
                } catch (e) {
                    this.logger.warn('Cannot load user answer logs', e as any)
                }
            } else {
                // Nếu là attempt mới (từ SKIPPED/COMPLETED/FAIL) hoặc IN_PROGRESS, không load answers cũ
                // answeredCount sẽ là 0, selectedAnswerIds sẽ là empty
                try {
                    const logsRes = await this.userAnswerLogService.findByUserExerciseAttemptId(userExerciseAttemptId)
                    const logs = (logsRes?.data?.results || []) as any[]
                    answeredCount = logs.length
                } catch (e) {
                    this.logger.warn('Cannot load user answer logs', e as any)
                }
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
                                const answerLabel = pickLabelFromComposite(ans?.answerJp || '', normalizedLang)
                                const isChosen = selectedAnswerIds.has(ans.id)
                                return {
                                    id: ans.id,
                                    answer: answerLabel,
                                    ...(isChosen ? { choose: 'choose' } : {})
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

            this.logger.log(`Getting exercise attempt for user ${userId} in exercise ${exerciseId}, using attempt ${userExerciseAttemptId} with status ${attempt?.status}`)

            return {
                statusCode: 200,
                data: {
                    ...result.data,
                    userExerciseAttemptId,
                    totalQuestions: ((result.data as any)?.testSet?.testSetQuestionBanks?.length) || 0,
                    answeredQuestions: answeredCount,
                    time: Number(attempt?.time ?? 0)
                },
                message: EXERCISES_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error getting latest exercise attempts by lesson:', error)
            if (error instanceof HttpException) {
                throw error
            }
            throw error
        }
    }

    async getExerciseAttemptReview(id: number, userId: number, languageCode: string): Promise<MessageResDTO> {
        try {
            const attemptRes = await this.findOne(id)
            const attempt = attemptRes.data as any

            // Kiểm tra attempt có thuộc về user này không
            if ((attempt as any)?.userId !== userId) {
                throw ForbiddenReviewAccessException
            }

            const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

            // Only build review when attempt is COMPLETED or FAIL
            // NOT_STARTED không được xem review
            if (attempt.status !== 'COMPLETED' && attempt.status !== 'FAIL') {
                return {
                    statusCode: 200,
                    message: this.i18nService.translate(UserExerciseAttemptMessage.REVIEW_NOT_COMPLETED, normalizedLang),
                    data: { status: attempt.status }
                }
            }

            const exerciseRes = await this.exercisesService.getExercisesByIdHaveQuestionBanks(attempt.exerciseId)
            const testSet = (exerciseRes.data as any)?.testSet

            // Load user answer logs for this attempt
            const logsRes = await this.userAnswerLogService.findByUserExerciseAttemptId(id)
            const logs: Array<{ questionBankId: number; answerId: number; isCorrect: boolean }> = (logsRes?.data?.results || []) as any
            const selectedByQuestion = new Map<number, number>(
                logs.map((l) => [Number(l.questionBankId), Number(l.answerId)])
            )

            // Tính tỷ lệ đúng trước khi xử lý review
            const totalQuestions = testSet?.testSetQuestionBanks?.length || 0
            const answeredCorrectCount = logs.filter((l: any) => l.isCorrect).length
            const correctPercentage = totalQuestions > 0 ? (answeredCorrectCount / totalQuestions) * 100 : 0
            const roundedPercentage = Math.round(correctPercentage * 100) / 100 // Làm tròn 2 chữ số thập phân để tránh floating point precision issues

            // Chỉ cho xem review (bao gồm đáp án đúng) khi tỷ lệ đúng >= 80%
            // Nếu < 80%: không cho xem review và đáp án đúng
            // Nếu >= 80%: cho xem review với đáp án đúng được đánh dấu (type: 'correct_answer')
            if (roundedPercentage < 80) {
                return {
                    statusCode: 403,
                    message: this.i18nService.translate(UserExerciseAttemptMessage.REVIEW_INSUFFICIENT_SCORE, normalizedLang),
                    data: {
                        status: attempt.status,
                        totalQuestions,
                        answeredCorrect: answeredCorrectCount,
                        correctPercentage: Math.round(correctPercentage),
                        minimumRequired: 80
                    }
                }
            }

            const translateOrFallback = async (key?: string, jp?: string): Promise<string> => {
                if (key) {
                    const t = (await this.translationHelper.getTranslation(key, normalizedLang))
                        || (await this.translationHelper.getTranslation(key, 'vi'))
                    if (t) return t
                }
                return jp || ''
            }

            if (testSet?.testSetQuestionBanks?.length) {
                let answeredCorrect = 0
                let answeredInCorrect = 0
                const mappedBanks = await Promise.all(
                    testSet.testSetQuestionBanks.map(async (item: any) => {
                        const qb = item.questionBank
                        // Resolve question via translation keys with variants, fallback JP
                        let question = ''
                        if (qb?.questionKey) {
                            const keyCandidates = [
                                qb.questionKey,
                                qb.questionKey.endsWith('.meaning.1') ? qb.questionKey : `${qb.questionKey}.meaning.1`,
                                qb.questionKey.endsWith('.question') ? qb.questionKey : `${qb.questionKey}.question`
                            ]
                            for (const key of keyCandidates) {
                                const t = (await this.translationHelper.getTranslation(key, normalizedLang))
                                    || (await this.translationHelper.getTranslation(key, 'vi'))
                                if (t) { question = t; break }
                            }
                        }
                        if (!question) {
                            question = qb?.questionJp || ''
                        }

                        const answers = qb?.answers || []
                        const correct = answers.find((a: any) => a.isCorrect)
                        const userSelectedId = selectedByQuestion.get(qb.id)
                        const userSelected = answers.find((a: any) => a.id === userSelectedId)
                        const isCorrect = Boolean(correct && userSelectedId && userSelectedId === correct.id)
                        if (userSelectedId) {
                            if (isCorrect) answeredCorrect++
                            else answeredInCorrect++
                        }

                        // Build full answer list; mark correct answer và user-selected incorrect answer
                        // Lưu ý: Chỉ khi tỷ lệ đúng >= 80% mới được vào phần này (đã check ở trên)
                        // Vì vậy, đáp án đúng sẽ được hiển thị với type: 'correct_answer' và có explanation
                        const reviewAnswers: any[] = []
                        const toShortLabel = (text: string): string => {
                            if (!text) return ''
                            // If it looks like an explanation string: "<word>" trong tiếng..., keep the quoted word
                            const match = text.match(/"([^"]+)"/)
                            if (match && match[1]) return match[1].trim()
                            return text.trim()
                        }
                        for (const a of answers) {
                            const label = toShortLabel(pickLabelFromComposite(a?.answerJp || '', normalizedLang))
                            const explanation = await translateOrFallback(a?.answerKey, a?.answerJp)
                            let entry: any = { id: a.id, answer: label }
                            // Đánh dấu đáp án đúng (chỉ hiển thị khi tỷ lệ đúng >= 80%)
                            if (correct && a.id === correct.id) {
                                entry.type = 'correct_answer'
                                entry.explantion = explanation
                            } else if (userSelectedId && a.id === userSelectedId && (!correct || userSelectedId !== correct.id)) {
                                // Đánh dấu đáp án user chọn nhưng sai
                                entry.type = 'user_selected_incorrect'
                                entry.explantion = explanation
                            }
                            reviewAnswers.push(entry)
                        }

                        return {
                            id: item.id,
                            questionOrder: item.questionOrder,
                            questionBank: {
                                id: qb?.id,
                                question,
                                isCorrect,
                                answers: reviewAnswers
                            }
                        }
                    })
                )

                const data = {
                    id: (exerciseRes.data as any).id,
                    exerciseType: (exerciseRes.data as any).exerciseType,
                    isBlocked: (exerciseRes.data as any).isBlocked,
                    testSetId: (exerciseRes.data as any).testSetId,
                    testSet: {
                        id: testSet.id,
                        testSetQuestionBanks: mappedBanks
                    },
                    totalQuestions: mappedBanks.length,
                    answeredCorrect,
                    answeredInCorrect,
                    time: Number((attempt as any)?.time ?? 0),
                    status: (attempt as any)?.status
                }

                return {
                    statusCode: 200,
                    message: this.i18nService.translate(UserExerciseAttemptMessage.REVIEW_SUCCESS, normalizedLang),
                    data
                }
            }

            return {
                statusCode: 200,
                message: this.i18nService.translate(UserExerciseAttemptMessage.REVIEW_SUCCESS, normalizedLang),
                data: exerciseRes.data
            }
        } catch (error) {
            this.logger.error('Error building exercise attempt review:', error)
            if (error instanceof HttpException) {
                throw error
            }
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

            // 3. Đếm số exercises riêng biệt đã COMPLETED của user trong lesson này
            // Chỉ đếm số exercises khác nhau, không đếm số lần làm lại
            const completedExerciseIds = await this.userExerciseAttemptRepository.findCompletedExercisesByLesson(userId, lessonId)
            const completedCount = completedExerciseIds.length
            this.logger.log(`User ${userId} has completed ${completedCount}/${totalExercises} unique exercises in lesson ${lessonId}`)

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
}