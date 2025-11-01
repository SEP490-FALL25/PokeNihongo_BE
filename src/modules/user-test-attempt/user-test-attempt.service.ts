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
    ForbiddenReviewAccessException
} from '@/modules/user-test-attempt/dto/user-test-attempt.error'
import { TEST_MESSAGE, USER_TEST_ATTEMPT_MESSAGE } from '@/common/constants/message'
import { UserTestAttemptRepository } from '@/modules/user-test-attempt/user-test-attempt.repo'
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

@Injectable()
export class UserTestAttemptService {
    private readonly logger = new Logger(UserTestAttemptService.name)

    constructor(
        private readonly userTestAttemptRepository: UserTestAttemptRepository,
        private readonly questionBankService: QuestionBankService,
        private readonly userTestAnswerLogService: UserTestAnswerLogService,
        private readonly testService: TestService,
        private readonly testSetService: TestSetService,
        private readonly testSetQuestionBankService: TestSetQuestionBankService,
        private readonly translationHelper: TranslationHelperService,
        private readonly i18nService: I18nService,
        private readonly prisma: PrismaService
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
                    testSets: {
                        select: { id: true }
                    }
                }
            })

            if (!test || !test.testSets || test.testSets.length === 0) {
                throw new Error('Test không có test set nào')
            }

            const testSetIds = test.testSets.map(ts => ts.id)

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

            // 2. Lấy thông tin Test để biết các TestSets
            const testRes = await this.testService.findOne(attempt.testId, 'vi')
            if (!testRes || !testRes.data) {
                throw TestNotFoundException
            }

            // 3. Lấy tất cả TestSets của Test
            const test = await this.prisma.test.findUnique({
                where: { id: attempt.testId },
                include: {
                    testSets: {
                        select: { id: true }
                    }
                }
            })

            if (!test || !test.testSets || test.testSets.length === 0) {
                throw new Error('Test không có test set nào')
            }

            const testSetIds = test.testSets.map(ts => ts.id)

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
                throw new Error('Unauthorized: This attempt does not belong to you')
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
                throw new Error('Unauthorized: This attempt does not belong to you')
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

    async getTestAttemptByTestId(id: number, userId: number, languageCode: string): Promise<MessageResDTO | null> {
        try {
            // Lấy attempt base để biết testId
            const baseAttemptRes = await this.findOne(id, languageCode)
            const baseAttempt = baseAttemptRes.data as any

            // Kiểm tra attempt có thuộc về user này không
            if (baseAttempt?.userId !== userId) {
                throw ForbiddenReviewAccessException
            }

            const testId = baseAttempt.testId

            // Tìm attempt gần nhất theo thứ tự ưu tiên: IN_PROGRESS > ABANDONED > SKIPPED > COMPLETED/FAIL
            const latestAttempt = await this.userTestAttemptRepository.findLatestByPriority(userId, testId)

            if (!latestAttempt) {
                throw UserTestAttemptNotFoundException
            }

            // Nếu attempt gần nhất là SKIPPED, COMPLETED hoặc FAIL → tạo attempt mới hoàn toàn
            let attempt = latestAttempt
            let userTestAttemptId = latestAttempt.id
            let shouldLoadOldAnswers = false // Chỉ load answers cũ nếu là ABANDONED

            if (latestAttempt.status === 'NOT_STARTED') {
                // Nếu là NOT_STARTED, update thành IN_PROGRESS
                this.logger.log(`Latest attempt is NOT_STARTED, updating to IN_PROGRESS for user ${userId}, test ${testId}`)
                const updatedAttempt = await this.userTestAttemptRepository.update(
                    { id: latestAttempt.id },
                    { status: 'IN_PROGRESS' }
                )
                attempt = updatedAttempt as any
                userTestAttemptId = attempt.id
                shouldLoadOldAnswers = false
            } else if (latestAttempt.status === 'SKIPPED' || latestAttempt.status === 'COMPLETED' || latestAttempt.status === 'FAIL') {
                this.logger.log(`Latest attempt is ${latestAttempt.status}, creating new attempt for user ${userId}, test ${testId}`)
                const createAttempt = await this.create(userId, testId)
                attempt = createAttempt.data as any
                userTestAttemptId = attempt.id
                shouldLoadOldAnswers = false
            } else if (latestAttempt.status === 'ABANDONED') {
                // Nếu là ABANDONED, load answers cũ để khôi phục
                shouldLoadOldAnswers = true
            }

            // Lấy thông tin Test với các TestSets
            const testRes = await this.testService.findOne(testId, languageCode)
            const test = await this.prisma.test.findUnique({
                where: { id: testId },
                include: {
                    testSets: {
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
            })

            if (!test || !test.testSets || test.testSets.length === 0) {
                throw new Error('Test không có test set nào')
            }

            const normalizedLang = (languageCode || '').toLowerCase().split('-')[0] || 'vi'

            // Load user answer logs chỉ nếu cần khôi phục (ABANDONED)
            let selectedAnswerIds = new Set<number>()
            let answeredCount = 0
            if (shouldLoadOldAnswers) {
                try {
                    const logsRes = await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
                    const logs = (logsRes?.data?.results || []) as any[]
                    answeredCount = logs.length
                    if (attempt?.status === 'ABANDONED') {
                        const ids = logs.map((log: any) => log.answerId).filter((v: any) => typeof v === 'number')
                        selectedAnswerIds = new Set<number>(ids)
                    }
                } catch (e) {
                    this.logger.warn('Cannot load user test answer logs', e as any)
                }
            } else {
                try {
                    const logsRes = await this.userTestAnswerLogService.findByUserTestAttemptId(userTestAttemptId)
                    const logs = (logsRes?.data?.results || []) as any[]
                    answeredCount = logs.length
                } catch (e) {
                    this.logger.warn('Cannot load user test answer logs', e as any)
                }
            }

            // Xử lý các TestSets và Questions
            const allTestSets: any[] = []
            let totalQuestions = 0

            for (const testSet of test.testSets) {
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
                                const isChosen = selectedAnswerIds.has(ans.id)
                                return {
                                    id: ans.id,
                                    answer: answerLabel,
                                    ...(isChosen ? { choose: 'choose' } : {})
                                }
                            })
                        )

                        totalQuestions++

                        return {
                            id: item.id,
                            questionOrder: item.questionOrder,
                            questionBank: {
                                id: qb?.id,
                                question: questionText,
                                questionType: qb?.questionType,
                                audioUrl: qb?.audioUrl,
                                pronunciation: qb?.pronunciation,
                                answers: mappedAnswers
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
                    testSets: {
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
            })

            if (!test || !test.testSets || test.testSets.length === 0) {
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
            for (const testSet of test.testSets) {
                totalQuestions += testSet.testSetQuestionBanks.length
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

            for (const testSet of test.testSets) {
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
}

