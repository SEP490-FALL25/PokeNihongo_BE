import {
    CreateUserTestAttemptBodyType,
    GetUserTestAttemptByIdParamsType,
    GetUserTestAttemptListQueryType,
    UpdateUserTestAttemptBodyType
} from '@/modules/user-test-attempt/entities/user-test-attempt.entities'
import {
    InvalidUserTestAttemptDataException,
    UserTestAttemptNotFoundException,
    TestNotFoundException,
    ForbiddenReviewAccessException,
    UnauthorizedUserTestAttemptAccessException
} from '@/modules/user-test-attempt/dto/user-test-attempt.error'
import { TEST_MESSAGE, USER_TEST_ATTEMPT_MESSAGE } from '@/common/constants/message'
import { UserTestAttemptRepository } from '@/modules/user-test-attempt/user-test-attempt.repo'
import { UserTestRepository } from '@/modules/user-test/user-test.repo'
import { QuestionBankService } from '@/modules/question-bank/question-bank.service'
import { UserTestAnswerLogService } from '@/modules/user-test-answer-log/user-test-answer-log.service'
import { TestService } from '@/modules/test/test.service'
import { TestSetService } from '@/modules/testset/testset.service'
import { TestSetQuestionBankService } from '@/modules/testset-questionbank/testset-questionbank.service'
import { Injectable, Logger, HttpException } from '@nestjs/common'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TranslationHelperService } from '@/modules/translation/translation.helper.service'
import { I18nService } from '@/i18n/i18n.service'
import { UserTestAttemptMessage } from '@/i18n/message-keys'
import { pickLabelFromComposite } from '@/common/utils/prase.utils'
import { PrismaService } from '@/shared/services/prisma.service'
import { UserRepo } from '@/modules/user/user.repo'
import { LevelRepo } from '@/modules/level/level.repo'
import { LEVEL_TYPE } from '@/common/constants/level.constant'

@Injectable()
export class UserTestAttemptService {
    private readonly logger = new Logger(UserTestAttemptService.name)

    constructor(
        private readonly userTestAttemptRepository: UserTestAttemptRepository,
        private readonly userTestRepository: UserTestRepository,
        private readonly questionBankService: QuestionBankService,
        private readonly userTestAnswerLogService: UserTestAnswerLogService,
        private readonly testService: TestService,
        private readonly testSetService: TestSetService,
        private readonly testSetQuestionBankService: TestSetQuestionBankService,
        private readonly translationHelper: TranslationHelperService,
        private readonly i18nService: I18nService,
        private readonly prisma: PrismaService,
        private readonly userRepo: UserRepo,
        private readonly levelRepo: LevelRepo
    ) { }

    async create(userId: number, testId: number) {
        try {
            // 1. Lấy thông tin Test
            const testRes = await this.testService.findOne(testId, 'vi')
            if (!testRes || !testRes.data) {
                throw TestNotFoundException
            }

            const userTestAttempt = await this.userTestAttemptRepository.create({
                userId: userId,
                testId: testId
            })

            return {
                data: userTestAttempt,
                message: USER_TEST_ATTEMPT_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating user test attempt:', error)
            if (error instanceof HttpException) {
                throw error
            }
            throw InvalidUserTestAttemptDataException
        }
    }

    async findAll(query: GetUserTestAttemptListQueryType) {
        const { currentPage, pageSize, userId, testId, status } = query

        const result = await this.userTestAttemptRepository.findMany({
            currentPage,
            pageSize,
            userId,
            testId,
            status
        })

        return {
            statusCode: 200,
            message: USER_TEST_ATTEMPT_MESSAGE.GET_LIST_SUCCESS,
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

    async findOne(id: number, lang: string) {
        const userTestAttempt = await this.userTestAttemptRepository.findUnique({
            id: id
        })

        if (!userTestAttempt) {
            throw UserTestAttemptNotFoundException
        }

        const message = this.i18nService.translate(
            USER_TEST_ATTEMPT_MESSAGE.GET_SUCCESS,
            lang || 'vi'
        )

        return {
            statusCode: 200,
            data: userTestAttempt,
            message: message || USER_TEST_ATTEMPT_MESSAGE.GET_SUCCESS
        }
    }

    async update(id: number, body: UpdateUserTestAttemptBodyType) {
        try {
            const userTestAttempt = await this.userTestAttemptRepository.update({ id }, body)

            return {
                data: userTestAttempt,
                message: USER_TEST_ATTEMPT_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error updating user test attempt:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại') || error.message?.includes('đã tồn tại')) {
                throw error
            }
            throw InvalidUserTestAttemptDataException
        }
    }

    async remove(id: number) {
        try {
            const userTestAttempt = await this.userTestAttemptRepository.delete({ id })

            return {
                data: userTestAttempt,
                message: USER_TEST_ATTEMPT_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error deleting user test attempt:', error)
            if (error instanceof HttpException || error.message?.includes('không tồn tại')) {
                throw error
            }
            throw InvalidUserTestAttemptDataException
        }
    }

    async checkTestCompletion(userTestAttemptId: number, userId: number) {
        try {
            this.logger.log(`Checking completion for user test attempt: ${userTestAttemptId}`)

            // 1. Lấy thông tin UserTestAttempt
            const attempt = await this.userTestAttemptRepository.findById(userTestAttemptId)
            if (!attempt) {
                throw UserTestAttemptNotFoundException
            }

            // 2. Lấy thông tin Test để biết các TestSets
            const testRes = await this.testService.findOne(attempt.testId, 'vi')
            if (!testRes || !testRes.data) {
                throw TestNotFoundException
            }

            // 3. Lấy tất cả TestSets của Test
            const test = await this.prisma.test.findUnique({
                where: { id: attempt.testId },
                include: {
                    testTestSets: {
                        select: {
                            testSet: {
                                select: { id: true }
                            }
                        }
                    }
                }
            })

            if (!test || !test.testTestSets || test.testTestSets.length === 0) {
                throw new Error('Test không có test set nào')
            }

            const testSetIds = test.testTestSets.map(tts => tts.testSet.id)

            // 4. Lấy tất cả QuestionBanks từ tất cả TestSets
            const allQuestionBanks: any[] = []
            for (const testSetId of testSetIds) {
                const questionsResult = await this.testSetQuestionBankService.findFullByTestSetId(testSetId, 'vi')
                if (questionsResult.data && Array.isArray(questionsResult.data)) {
                    allQuestionBanks.push(...questionsResult.data)
                }
            }

            this.logger.log(`Found ${allQuestionBanks.length} questions for test ${attempt.testId}`)

            // 5. Lấy tất cả UserTestAnswerLog của attempt này
            const answerLogsResult = await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
            const userAnswers = answerLogsResult.data.results
            this.logger.log(`Found ${userAnswers.length} user answers for attempt ${userTestAttemptId}`)

            // 6. Kiểm tra xem đã trả lời hết chưa
            const answeredQuestionIds = new Set(userAnswers.map(log => (log as any).questionBankId))
            const unansweredQuestions = allQuestionBanks.filter(q => !answeredQuestionIds.has(q.questionBankId))
            if (unansweredQuestions.length > 0) {
                this.logger.log(`Still ${unansweredQuestions.length} unanswered questions`)
                return {
                    statusCode: 200,
                    message: 'Bạn chưa trả lời đủ câu hỏi',
                    data: {
                        isCompleted: false,
                        totalQuestions: allQuestionBanks.length,
                        answeredQuestions: userAnswers.length,
                        unansweredQuestions: unansweredQuestions.length,
                        unansweredQuestionIds: unansweredQuestions.map(q => q.questionBankId),
                        allCorrect: false,
                        status: 'IN_PROGRESS'
                    }
                }
            }

            // 7. Kiểm tra xem tất cả câu trả lời có đúng không
            const allCorrect = userAnswers.every(log => log.isCorrect)

            // 8. Chỉ trả kết quả, KHÔNG cập nhật DB trong hàm check
            const finalStatus = allCorrect ? 'COMPLETED' : 'FAIL'
            const message = allCorrect
                ? 'Chúc mừng! Bạn đã hoàn thành bài test và trả lời đúng hết'
                : 'Bạn đã hoàn thành bài test nhưng có một số câu trả lời sai'

            return {
                statusCode: 200,
                message: message,
                data: {
                    isCompleted: true,
                    totalQuestions: allQuestionBanks.length,
                    answeredQuestions: userAnswers.length,
                    unansweredQuestions: 0,
                    allCorrect: allCorrect,
                    status: finalStatus
                }
            }

        } catch (error) {
            this.logger.error('Error checking test completion:', error)
            throw error
        }
    }

    async submitTestCompletion(userTestAttemptId: number, userId: number, timeSeconds?: number) {
        try {
            this.logger.log(`Submitting completion for user test attempt: ${userTestAttemptId}`)

            // 1. Lấy thông tin UserTestAttempt
            const attempt = await this.userTestAttemptRepository.findById(userTestAttemptId)
            if (!attempt) {
                throw UserTestAttemptNotFoundException
            }

            // 2. Kiểm tra xem attempt có thuộc về user này không
            if (attempt.userId !== userId) {
                throw UnauthorizedUserTestAttemptAccessException
            }

            // 3. Lấy thông tin Test để biết các TestSets
            const testRes = await this.testService.findOne(attempt.testId, 'vi')
            if (!testRes || !testRes.data) {
                throw TestNotFoundException
            }

            // 3. Lấy tất cả TestSets của Test
            const test = await this.prisma.test.findUnique({
                where: { id: attempt.testId },
                include: {
                    testTestSets: {
                        select: {
                            testSet: {
                                select: { id: true }
                            }
                        }
                    }
                }
            })

            if (!test || !test.testTestSets || test.testTestSets.length === 0) {
                throw new Error('Test không có test set nào')
            }

            const testSetIds = test.testTestSets.map(tts => tts.testSet.id)

            // 4. Lấy tất cả QuestionBanks từ tất cả TestSets
            const allQuestionBanks: any[] = []
            for (const testSetId of testSetIds) {
                const questionsResult = await this.testSetQuestionBankService.findFullByTestSetId(testSetId, 'vi')
                if (questionsResult.data && Array.isArray(questionsResult.data)) {
                    allQuestionBanks.push(...questionsResult.data)
                }
            }

            // 5. Lấy tất cả UserTestAnswerLog của attempt này
            const answerLogsResult = await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
            const userAnswers = answerLogsResult.data.results

            // 6. Kiểm tra xem đã trả lời hết chưa
            const answeredQuestionIds = new Set(userAnswers.map(log => (log as any).questionBankId))
            const unansweredQuestions = allQuestionBanks.filter(q => !answeredQuestionIds.has(q.questionBankId))

            // Nếu không có câu trả lời nào mà vẫn nộp bài, coi như FAIL
            if (userAnswers.length === 0) {
                const newStatus = 'FAIL'
                const message = 'Bạn đã nộp bài nhưng chưa trả lời câu hỏi nào'

                await this.userTestAttemptRepository.update(
                    { id: userTestAttemptId },
                    { status: newStatus, ...(timeSeconds !== undefined ? { time: timeSeconds } : {}) }
                )
                this.logger.log(`Updated attempt ${userTestAttemptId} to ${newStatus} - no answers provided`)

                return {
                    statusCode: 200,
                    message: message,
                    data: {
                        isCompleted: true,
                        totalQuestions: allQuestionBanks.length,
                        answeredQuestions: 0,
                        unansweredQuestions: allQuestionBanks.length,
                        unansweredQuestionIds: allQuestionBanks.map(q => q.questionBankId),
                        allCorrect: false,
                        status: newStatus
                    }
                }
            }

            // Nếu chưa trả lời hết, coi như FAIL
            if (unansweredQuestions.length > 0) {
                const newStatus = 'FAIL'
                const message = 'Bạn đã nộp bài nhưng chưa trả lời đủ câu hỏi'

                await this.userTestAttemptRepository.update(
                    { id: userTestAttemptId },
                    { status: newStatus, ...(timeSeconds !== undefined ? { time: timeSeconds } : {}) }
                )
                this.logger.log(`Updated attempt ${userTestAttemptId} to ${newStatus} - incomplete answers`)

                return {
                    statusCode: 200,
                    message: message,
                    data: {
                        isCompleted: true,
                        totalQuestions: allQuestionBanks.length,
                        answeredQuestions: userAnswers.length,
                        unansweredQuestions: unansweredQuestions.length,
                        unansweredQuestionIds: unansweredQuestions.map(q => q.questionBankId),
                        allCorrect: false,
                        status: newStatus
                    }
                }
            }

            // 7. Kiểm tra xem tất cả câu trả lời có đúng không
            const allCorrect = userAnswers.every(log => log.isCorrect)

            // 8. Tính điểm số (số câu đúng / tổng số câu * 100)
            const score = Math.round((userAnswers.filter(log => log.isCorrect).length / allQuestionBanks.length) * 100)

            // 9. Update status dựa trên kết quả
            let newStatus: string
            let message: string

            if (allCorrect) {
                newStatus = 'COMPLETED'
                message = 'Chúc mừng! Bạn đã hoàn thành bài test và trả lời đúng hết'
            } else {
                newStatus = 'FAIL'
                message = 'Bạn đã hoàn thành bài test nhưng có một số câu trả lời sai'
            }

            // Update status và score trong database
            await this.userTestAttemptRepository.update(
                { id: userTestAttemptId },
                { status: newStatus, score, ...(timeSeconds !== undefined ? { time: timeSeconds } : {}) }
            )
            this.logger.log(`Updated attempt ${userTestAttemptId} to ${newStatus} with score ${score}`)

            return {
                statusCode: 200,
                message: message,
                data: {
                    isCompleted: true,
                    totalQuestions: allQuestionBanks.length,
                    answeredQuestions: userAnswers.length,
                    unansweredQuestions: 0,
                    allCorrect: allCorrect,
                    status: newStatus,
                    score: score
                }
            }

        } catch (error) {
            this.logger.error('Error submitting test completion:', error)
            throw error
        }
    }

    async abandon(userTestAttemptId: number, userId: number, timeSeconds?: number) {
        try {
            this.logger.log(`Abandoning user test attempt: ${userTestAttemptId} for user: ${userId}`)

            // 1. Lấy thông tin UserTestAttempt
            const attempt = await this.userTestAttemptRepository.findById(userTestAttemptId)
            if (!attempt) {
                throw UserTestAttemptNotFoundException
            }

            // 2. Kiểm tra xem attempt có thuộc về user này không
            if (attempt.userId !== userId) {
                throw UnauthorizedUserTestAttemptAccessException
            }

            // 3. Kiểm tra xem attempt có đang IN_PROGRESS không
            if (attempt.status !== 'IN_PROGRESS') {
                return {
                    statusCode: 400,
                    message: 'Chỉ có thể bỏ dở bài test đang trong trạng thái IN_PROGRESS',
                    data: attempt
                }
            }

            // 4. Update status thành ABANDONED
            const updatedAttempt = await this.userTestAttemptRepository.update(
                { id: userTestAttemptId },
                { status: 'ABANDONED', ...(timeSeconds !== undefined ? { time: timeSeconds } : {}) }
            )

            this.logger.log(`Updated attempt ${userTestAttemptId} to ABANDONED`)

            return {
                statusCode: 200,
                message: 'Đã đánh dấu bài test là bỏ dở',
                data: updatedAttempt
            }

        } catch (error) {
            this.logger.error('Error abandoning test attempt:', error)
            throw error
        }
    }

    async getStatus(userTestAttemptId: number, userId: number, lang: string) {
        try {
            this.logger.log(`Getting status for user test attempt: ${userTestAttemptId} for user: ${userId}`)

            // 1. Lấy thông tin UserTestAttempt
            const attempt = await this.userTestAttemptRepository.findById(userTestAttemptId)
            if (!attempt) {
                throw UserTestAttemptNotFoundException
            }

            // 2. Kiểm tra xem attempt có thuộc về user này không
            if (attempt.userId !== userId) {
                throw UnauthorizedUserTestAttemptAccessException
            }

            const message = this.i18nService.translate(
                USER_TEST_ATTEMPT_MESSAGE.GET_STATUS_SUCCESS,
                lang || 'vi'
            )

            return {
                statusCode: 200,
                message: message || USER_TEST_ATTEMPT_MESSAGE.GET_STATUS_SUCCESS,
                data: attempt
            }

        } catch (error) {
            this.logger.error('Error getting test attempt status:', error)
            throw error
        }
    }

    async getTestAttemptByTestId(testId: number, userId: number, languageCode: string): Promise<MessageResDTO | null> {
        try {
            const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

            // Kiểm tra và giảm limit của UserTest
            const userTest = await this.userTestRepository.findByUserAndTest(userId, testId)
            if (!userTest) {
                const message = this.i18nService.translate(UserTestAttemptMessage.USER_TEST_NOT_FOUND, normalizedLang)
                throw new HttpException(message || 'Không tìm thấy UserTest', 400)
            }

            // Kiểm tra limit (undefined được coi như không giới hạn)
            if (userTest.limit !== null && userTest.limit !== undefined && userTest.limit <= 0) {
                const message = this.i18nService.translate(UserTestAttemptMessage.OUT_OF_LIMIT, normalizedLang)
                throw new HttpException(message || 'Bạn đã hết lượt làm bài test này', 400)
            }

            // Tìm attempt IN_PROGRESS gần nhất của user với test này
            const inProgressAttempt = await this.prisma.userTestAttempt.findFirst({
                where: {
                    userId,
                    testId,
                    status: 'IN_PROGRESS'
                },
                orderBy: {
                    createdAt: 'desc' // Lấy attempt được tạo gần nhất
                }
            })

            let attempt: any
            let userTestAttemptId: number

            if (inProgressAttempt) {
                // Kiểm tra thời gian: nếu attempt được tạo/update hơn 1 tiếng trước → ABANDONED và tạo mới
                const now = new Date()
                const attemptTime = inProgressAttempt.updatedAt || inProgressAttempt.createdAt
                const timeDiffMs = now.getTime() - attemptTime.getTime()
                const oneHourMs = 60 * 60 * 1000 // 1 tiếng = 3,600,000ms

                if (timeDiffMs > oneHourMs) {
                    // Quá 1 tiếng → đánh dấu ABANDONED và tạo mới
                    this.logger.log(`Attempt ${inProgressAttempt.id} is older than 1 hour (${Math.round(timeDiffMs / (60 * 1000))} minutes), marking as ABANDONED and creating new one`)
                    await this.prisma.userTestAttempt.update({
                        where: { id: inProgressAttempt.id },
                        data: { status: 'ABANDONED' }
                    })

                    // Giảm limit và tạo attempt mới
                    await this.userTestRepository.decrementLimit(userId, testId)
                    const createAttempt = await this.create(userId, testId)
                    attempt = createAttempt.data as any
                    userTestAttemptId = attempt.id
                } else {
                    // Dưới 1 tiếng → reuse và update updatedAt
                    this.logger.log(`Found existing IN_PROGRESS attempt (ID: ${inProgressAttempt.id}) for user ${userId} and test ${testId}, reusing it (age: ${Math.round(timeDiffMs / (60 * 1000))} minutes)`)

                    // Update updatedAt để reset timer
                    await this.prisma.userTestAttempt.update({
                        where: { id: inProgressAttempt.id },
                        data: { updatedAt: now }
                    })

                    attempt = await this.userTestAttemptRepository.findById(inProgressAttempt.id)
                    if (!attempt) {
                        throw UserTestAttemptNotFoundException
                    }
                    userTestAttemptId = attempt.id
                }
            } else {
                // Nếu không có IN_PROGRESS (có thể là ABANDONED, COMPLETED, FAIL hoặc chưa có) → tạo mới
                this.logger.log(`No IN_PROGRESS attempt found for user ${userId} and test ${testId}, creating new attempt`)

                // Giảm limit trước khi cho phép làm bài (chỉ khi tạo mới)
                await this.userTestRepository.decrementLimit(userId, testId)

                const createAttempt = await this.create(userId, testId)
                attempt = createAttempt.data as any
                userTestAttemptId = attempt.id
            }

            // Lấy thông tin Test với các TestSets
            const testRes = await this.testService.findOne(testId, languageCode)
            const test = await this.prisma.test.findUnique({
                where: { id: testId },
                include: {
                    testTestSets: {
                        include: {
                            testSet: {
                                include: {
                                    testSetQuestionBanks: {
                                        include: {
                                            questionBank: {
                                                include: {
                                                    answers: true
                                                }
                                            }
                                        },
                                        orderBy: {
                                            questionOrder: 'asc'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            })

            if (!test || !test.testTestSets || test.testTestSets.length === 0) {
                throw new Error('Test không có test set nào')
            }

            // Load user answer logs (nếu reuse attempt IN_PROGRESS thì có thể đã có logs)
            let answeredCount = 0
            let userAnswerLogs: any[] = []
            const answerLogsResult = await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
            if (answerLogsResult?.data?.results) {
                userAnswerLogs = answerLogsResult.data.results
                answeredCount = userAnswerLogs.length
                this.logger.log(`Found ${answeredCount} existing answer logs for attempt ${userTestAttemptId}`)
            }

            // Tạo map để check xem question nào đã được trả lời và câu trả lời là gì
            const answeredQuestionMap = new Map<number, number>() // questionBankId -> answerId
            userAnswerLogs.forEach((log: any) => {
                answeredQuestionMap.set(log.questionBankId, log.answerId)
            })

            // Xử lý các TestSets và Questions
            const allTestSets: any[] = []
            let totalQuestions = 0

            for (const testTestSet of test.testTestSets) {
                const testSet = testTestSet.testSet
                const testSetData: any = {
                    id: testSet.id,
                    name: testSet.name,
                    description: testSet.description,
                    content: testSet.content, // Cho READING type
                    audioUrl: testSet.audioUrl, // Cho LISTENING type
                    testType: testSet.testType,
                    testSetQuestionBanks: []
                }

                // Map questions với translations
                const mappedBanks = await Promise.all(
                    testSet.testSetQuestionBanks.map(async (item: any) => {
                        const qb = item.questionBank
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
                            questionText = qb?.questionJp || ''
                        }

                        const mappedAnswers = await Promise.all(
                            (qb?.answers || []).map(async (ans: any) => {
                                const answerLabel = pickLabelFromComposite(ans?.answerJp || '', normalizedLang)
                                return {
                                    id: ans.id,
                                    answer: answerLabel
                                }
                            })
                        )

                        totalQuestions++

                        // Kiểm tra xem user đã trả lời câu này chưa (khi reuse attempt IN_PROGRESS)
                        const userSelectedAnswerId = answeredQuestionMap.get(qb?.id)

                        return {
                            id: item.id,
                            questionOrder: item.questionOrder,
                            questionBank: {
                                id: qb?.id,
                                question: questionText,
                                questionType: qb?.questionType,
                                audioUrl: qb?.audioUrl,
                                pronunciation: qb?.pronunciation,
                                answers: mappedAnswers,
                                selectedAnswerId: userSelectedAnswerId || undefined // ID câu trả lời đã chọn (nếu có)
                            }
                        }
                    })
                )

                testSetData.testSetQuestionBanks = mappedBanks
                allTestSets.push(testSetData)
            }

            this.logger.log(`Getting test attempt for user ${userId} in test ${testId}, using attempt ${userTestAttemptId} with status ${attempt?.status}`)

            const message = this.i18nService.translate(
                TEST_MESSAGE.GET_SUCCESS,
                normalizedLang
            )

            return {
                statusCode: 200,
                data: {
                    id: test.id,
                    name: testRes.data.name,
                    description: testRes.data.description,
                    testType: test.testType,
                    testSets: allTestSets,
                    userTestAttemptId,
                    totalQuestions,
                    answeredQuestions: answeredCount,
                    time: Number(attempt?.time ?? 0)
                },
                message: message || TEST_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error getting test attempt by test id:', error)
            if (error instanceof HttpException) {
                throw error
            }
            throw error
        }
    }

    async getTestAttemptReview(id: number, userId: number, languageCode: string): Promise<MessageResDTO> {
        try {
            const attemptRes = await this.findOne(id, languageCode)
            const attempt = attemptRes.data as any

            // Kiểm tra attempt có thuộc về user này không
            if ((attempt as any)?.userId !== userId) {
                throw ForbiddenReviewAccessException
            }

            const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

            // Only build review when attempt is COMPLETED or FAIL
            if (attempt.status !== 'COMPLETED' && attempt.status !== 'FAIL') {
                return {
                    statusCode: 200,
                    message: this.i18nService.translate(UserTestAttemptMessage.REVIEW_NOT_COMPLETED, normalizedLang),
                    data: { status: attempt.status }
                }
            }

            // Lấy thông tin Test với các TestSets
            const test = await this.prisma.test.findUnique({
                where: { id: attempt.testId },
                include: {
                    testTestSets: {
                        include: {
                            testSet: {
                                include: {
                                    testSetQuestionBanks: {
                                        include: {
                                            questionBank: {
                                                include: {
                                                    answers: true
                                                }
                                            }
                                        },
                                        orderBy: {
                                            questionOrder: 'asc'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            })

            if (!test || !test.testTestSets || test.testTestSets.length === 0) {
                throw new Error('Test không có test set nào')
            }

            // Load user answer logs for this attempt
            const logsRes = await this.userTestAnswerLogService.findByUserTestAttemptId(id)
            const logs: Array<{ questionBankId: number; answerId: number; isCorrect: boolean }> = (logsRes?.data?.results || []) as any
            const selectedByQuestion = new Map<number, number>(
                logs.map((l) => [Number(l.questionBankId), Number(l.answerId)])
            )

            // Tính tỷ lệ đúng trước khi xử lý review
            let totalQuestions = 0
            for (const testTestSet of test.testTestSets) {
                totalQuestions += testTestSet.testSet.testSetQuestionBanks.length
            }
            const answeredCorrectCount = logs.filter((l: any) => l.isCorrect).length
            const correctPercentage = totalQuestions > 0 ? (answeredCorrectCount / totalQuestions) * 100 : 0

            // Chỉ cho xem review khi tỷ lệ đúng >= 80%
            if (correctPercentage < 80) {
                return {
                    statusCode: 403,
                    message: this.i18nService.translate(UserTestAttemptMessage.REVIEW_INSUFFICIENT_SCORE, normalizedLang),
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

            const allTestSets: any[] = []
            let answeredCorrect = 0
            let answeredInCorrect = 0

            for (const testTestSet of test.testTestSets) {
                const testSet = testTestSet.testSet
                const testSetData: any = {
                    id: testSet.id,
                    name: testSet.name,
                    description: testSet.description,
                    content: testSet.content,
                    audioUrl: testSet.audioUrl,
                    testType: testSet.testType,
                    testSetQuestionBanks: []
                }

                const mappedBanks = await Promise.all(
                    testSet.testSetQuestionBanks.map(async (item: any) => {
                        const qb = item.questionBank
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

                        // Build full answer list; mark correct and user-selected incorrect
                        const reviewAnswers: any[] = []
                        const toShortLabel = (text: string): string => {
                            if (!text) return ''
                            const match = text.match(/"([^"]+)"/)
                            if (match && match[1]) return match[1].trim()
                            return text.trim()
                        }
                        for (const a of answers) {
                            const label = toShortLabel(pickLabelFromComposite(a?.answerJp || '', normalizedLang))
                            const explanation = await translateOrFallback(a?.answerKey, a?.answerJp)
                            let entry: any = { id: a.id, answer: label }
                            if (correct && a.id === correct.id) {
                                entry.type = 'correct_answer'
                                entry.explantion = explanation
                            } else if (userSelectedId && a.id === userSelectedId && (!correct || userSelectedId !== correct.id)) {
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

                testSetData.testSetQuestionBanks = mappedBanks
                allTestSets.push(testSetData)
            }

            const testRes = await this.testService.findOne(attempt.testId, normalizedLang)

            const data = {
                id: test.id,
                name: testRes.data.name,
                description: testRes.data.description,
                testType: test.testType,
                testSets: allTestSets,
                totalQuestions,
                answeredCorrect,
                answeredInCorrect,
                time: Number((attempt as any)?.time ?? 0),
                status: (attempt as any)?.status,
                score: (attempt as any)?.score ?? 0
            }

            return {
                statusCode: 200,
                message: this.i18nService.translate(UserTestAttemptMessage.REVIEW_SUCCESS, normalizedLang),
                data
            }
        } catch (error) {
            this.logger.error('Error building test attempt review:', error)
            if (error instanceof HttpException) {
                throw error
            }
            throw error
        }
    }

    async submitPlacementTestCompletion(userTestAttemptId: number, userId: number, timeSeconds?: number) {
        try {
            this.logger.log(`Submitting placement test completion for attempt: ${userTestAttemptId}`)

            // 1. Lấy thông tin UserTestAttempt
            const attempt = await this.userTestAttemptRepository.findById(userTestAttemptId)
            if (!attempt) {
                throw UserTestAttemptNotFoundException
            }

            // 2. Kiểm tra xem attempt có thuộc về user này không
            if (attempt.userId !== userId) {
                throw UnauthorizedUserTestAttemptAccessException
            }

            // 3. Lấy thông tin Test để lấy các TestSets
            const test = await this.testService.findOne(attempt.testId, 'vi')
            if (!test || !test.data) {
                throw TestNotFoundException
            }

            // 4. Lấy các TestSets của Test
            const testTestSets = await this.prisma.testTestSet.findMany({
                where: { testId: attempt.testId },
                select: { testSetId: true }
            })

            if (testTestSets.length === 0) {
                throw new HttpException('Test này chưa có TestSet nào', 400)
            }

            const testSetIds = testTestSets.map((tts: any) => tts.testSetId)

            // 5. Lấy tất cả Question từ các TestSets
            const allQuestions = await this.prisma.testSetQuestionBank.findMany({
                where: {
                    testSetId: { in: testSetIds }
                },
                include: {
                    questionBank: {
                        select: {
                            id: true,
                            levelN: true,
                            questionType: true
                        }
                    }
                }
            })

            // Chỉ lấy các loại VOCABULARY, GRAMMAR, KANJI
            const filteredQuestions = allQuestions.filter(
                tsqb => ['VOCABULARY', 'GRAMMAR', 'KANJI'].includes(tsqb.questionBank.questionType)
            )

            this.logger.log(`Found ${filteredQuestions.length} questions for test ${attempt.testId}`)

            // 6. Lấy tất cả UserTestAnswerLog của attempt này
            const answerLogsResult = await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
            const userAnswers = answerLogsResult.data.results
            this.logger.log(`Found ${userAnswers.length} user answers for attempt ${userTestAttemptId}`)

            // 7. Tạo map để lấy câu trả lời nhanh
            const answerMap = new Map<number, boolean>()
            userAnswers.forEach((log: any) => {
                answerMap.set(log.questionBankId, log.isCorrect)
            })

            // 8. Nhóm questions theo levelN và tính tỷ lệ đúng
            const questionsByLevel: Record<number, { total: number; correct: number }> = {
                1: { total: 0, correct: 0 },
                2: { total: 0, correct: 0 },
                3: { total: 0, correct: 0 },
                4: { total: 0, correct: 0 },
                5: { total: 0, correct: 0 }
            }

            filteredQuestions.forEach((tsqb: any) => {
                const levelN = tsqb.questionBank.levelN || 5 // Mặc định N5 nếu không có levelN
                if (levelN >= 1 && levelN <= 5) {
                    questionsByLevel[levelN].total++
                    const isCorrect = answerMap.get(tsqb.questionBank.id) || false
                    if (isCorrect) {
                        questionsByLevel[levelN].correct++
                    }
                }
            })

            this.logger.log('Questions by level:', questionsByLevel)

            // 9. Đánh giá levelN với ngưỡng linh hoạt cho từng level
            // N5 = 5 (dễ nhất), N4 = 4, N3 = 3
            // Logic: Duyệt tuần tự từ N5 → N4 → N3 với ngưỡng cụ thể cho từng level
            // - N5: đúng >= 2/3 câu (66.7%)
            // - N4: đúng >= 3/4 câu (75%)
            // - N3: đúng >= 2/3 câu (66.7%)
            let evaluatedLevelN = 5 // Mặc định N5 (thấp nhất)

            // Bước 1: Kiểm tra N5 (3 câu) - Ngưỡng: đúng >= 2 câu (66.7%)
            const n5Stats = questionsByLevel[5]
            if (n5Stats.total > 0) {
                if (n5Stats.correct >= 2) {
                    // Đỗ N5: đúng >= 2/3 câu
                    evaluatedLevelN = 4 // Cập nhật trình độ tạm thời
                    this.logger.log(`User passed N5: ${n5Stats.correct}/${n5Stats.total} correct (>= 66.7%), moving to N4`)
                } else {
                    // Trượt N5: đúng < 2 câu
                    evaluatedLevelN = 5
                    this.logger.log(`User failed N5: ${n5Stats.correct}/${n5Stats.total} correct (< 66.7%), final level: N5`)
                }
            } else {
                this.logger.warn(`No N5 questions found, keeping level at N5`)
            }

            // Bước 2: Kiểm tra N4 (4 câu) - Ngưỡng: đúng >= 3 câu (75%)
            if (evaluatedLevelN === 4) {
                const n4Stats = questionsByLevel[4]
                if (n4Stats.total > 0) {
                    if (n4Stats.correct >= 3) {
                        // Đỗ N4: đúng >= 3/4 câu
                        evaluatedLevelN = 3 // Cập nhật trình độ tạm thời
                        this.logger.log(`User passed N4: ${n4Stats.correct}/${n4Stats.total} correct (>= 75%), moving to N3`)
                    } else {
                        // Trượt N4: đúng < 3 câu
                        evaluatedLevelN = 4
                        this.logger.log(`User failed N4: ${n4Stats.correct}/${n4Stats.total} correct (< 75%), final level: N4`)
                    }
                } else {
                    this.logger.warn(`No N4 questions found, keeping level at N4`)
                }
            }

            // Bước 3: Kiểm tra N3 (3 câu) - Ngưỡng: đúng >= 2 câu (66.7%)
            if (evaluatedLevelN === 3) {
                const n3Stats = questionsByLevel[3]
                if (n3Stats.total > 0) {
                    if (n3Stats.correct >= 2) {
                        // Đỗ N3: đúng >= 2/3 câu
                        evaluatedLevelN = 2 // Sẵn sàng học N2
                        this.logger.log(`User passed N3: ${n3Stats.correct}/${n3Stats.total} correct (>= 66.7%), final level: N2`)
                    } else {
                        // Trượt N3: đúng < 2 câu
                        evaluatedLevelN = 3
                        this.logger.log(`User failed N3: ${n3Stats.correct}/${n3Stats.total} correct (< 66.7%), final level: N3`)
                    }
                } else {
                    this.logger.warn(`No N3 questions found, keeping level at N3`)
                }
            }

            this.logger.log(`Final evaluated levelN: N${evaluatedLevelN}`)

            // 10. Tìm Level trong DB với levelNumber = evaluatedLevelN và levelType = USER
            const level = await this.levelRepo.findByLevelAndType(evaluatedLevelN, LEVEL_TYPE.USER)
            if (!level) {
                this.logger.warn(`Level N${evaluatedLevelN} not found in database, keeping current user level`)
            } else {
                // 11. Cập nhật levelId của User
                await this.userRepo.update({
                    id: userId,
                    updatedById: userId,
                    data: { levelId: level.id }
                })
                this.logger.log(`Updated user ${userId} levelId to ${level.id} (N${evaluatedLevelN})`)
            }

            // 12. Update status và time của UserTestAttempt
            await this.userTestAttemptRepository.update(
                { id: userTestAttemptId },
                { status: 'COMPLETED', ...(timeSeconds !== undefined ? { time: timeSeconds } : {}) }
            )
            this.logger.log(`Updated attempt ${userTestAttemptId} to COMPLETED`)

            // 13. Trả về kết quả với levelN được đánh giá
            return {
                statusCode: 200,
                message: 'Đánh giá trình độ hoàn thành',
                data: {
                    levelN: evaluatedLevelN,
                    levelId: level?.id || null
                }
            }

        } catch (error) {
            this.logger.error('Error submitting placement test completion:', error)
            if (error instanceof HttpException) {
                throw error
            }
            throw error
        }
    }
}

