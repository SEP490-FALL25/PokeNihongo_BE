import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { GetHistoryListQueryType, GetAdminHistoryListQueryType } from './entities/user-history.entities'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TestAttemptStatus, ExerciseAttemptStatus } from '@prisma/client'
import { I18nService } from '@/i18n/i18n.service'
import { UserHistoryMessage } from '@/i18n/message-keys'

@Injectable()
export class UserHistoryService {
    private readonly logger = new Logger(UserHistoryService.name)

    constructor(
        private readonly prisma: PrismaService,
        private readonly i18nService: I18nService
    ) { }

    async findHistory(userId: number, query: GetHistoryListQueryType, language?: string): Promise<MessageResDTO> {
        try {
            this.logger.log(`Finding history for user ${userId}, type: ${query.type || 'ALL'}`)

            const { currentPage = 1, pageSize = 10, type, status } = query
            const skip = (currentPage - 1) * pageSize
            const normalizedLang = (language || '').toLowerCase().split('-')[0] || 'vi'

            // Lấy userTestAttempts nếu type là TEST hoặc không filter
            const testAttempts = (type === 'TEST' || !type) ? await this.prisma.userTestAttempt.findMany({
                where: {
                    userId,
                    ...(status ? { status: status as TestAttemptStatus } : {})
                },
                include: {
                    test: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }) : []

            // Lấy userExerciseAttempts nếu type là EXERCISE hoặc không filter
            const exerciseAttempts = (type === 'EXERCISE' || !type) ? await this.prisma.userExerciseAttempt.findMany({
                where: {
                    userId,
                    ...(status ? { status: status as ExerciseAttemptStatus } : {})
                },
                include: {
                    exercise: {
                        include: {
                            testSet: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }) : []

            // Map test attempts
            const testHistoryItems = await Promise.all(
                testAttempts.map(async (attempt: any) => {
                    // Lấy answer logs để tính correct/incorrect
                    const answerLogs = await this.prisma.userTestAnswerLog.findMany({
                        where: {
                            userTestAttemptId: attempt.id
                        }
                    })

                    const correctAnswers = answerLogs.filter(log => log.isCorrect).length
                    const incorrectAnswers = answerLogs.filter(log => !log.isCorrect).length
                    const totalQuestions = answerLogs.length

                    // Lấy tên test với i18n
                    let testName = attempt.test.name || ''
                    if (language) {
                        // Lấy translation cho test name
                        const nameKey = `test.${attempt.test.id}.name`
                        const translationWhere: any = {
                            OR: [
                                { key: nameKey },
                                { key: { startsWith: nameKey + '.meaning.' } }
                            ]
                        }

                        if (language) {
                            const languageRecord = await this.prisma.languages.findFirst({
                                where: { code: language }
                            })
                            if (languageRecord) {
                                translationWhere.languageId = languageRecord.id
                            }
                        }

                        const translations = await this.prisma.translation.findMany({
                            where: translationWhere,
                            include: { language: true },
                            take: 1
                        })

                        if (translations.length > 0) {
                            const translation = translations.find(t => t.key.startsWith(nameKey + '.meaning.'))
                            if (translation) {
                                testName = translation.value
                            }
                        }
                    }

                    return {
                        id: attempt.id,
                        type: 'TEST' as const,
                        testId: attempt.testId,
                        testName,
                        exerciseId: null,
                        exerciseName: null,
                        status: attempt.status,
                        score: attempt.score ? Number(attempt.score) : null,
                        totalQuestions,
                        correctAnswers,
                        incorrectAnswers,
                        time: attempt.time,
                        createdAt: attempt.createdAt,
                        updatedAt: attempt.updatedAt
                    }
                })
            )

            // Map exercise attempts
            const exerciseHistoryItems = await Promise.all(
                exerciseAttempts.map(async (attempt: any) => {
                    // Lấy answer logs để tính correct/incorrect
                    const answerLogs = await this.prisma.userAnswerLog.findMany({
                        where: {
                            userExerciseAttemptId: attempt.id
                        }
                    })

                    const correctAnswers = answerLogs.filter(log => log.isCorrect).length
                    const incorrectAnswers = answerLogs.filter(log => !log.isCorrect).length
                    const totalQuestions = answerLogs.length

                    // Lấy tên exercise
                    let exerciseName = 'Bài tập'
                    if (attempt.exercise?.testSet) {
                        // Lấy translation cho testSet name
                        const nameKey = `testset.${attempt.exercise.testSet.id}.name`
                        const translationWhere: any = {
                            OR: [
                                { key: nameKey },
                                { key: { startsWith: nameKey + '.meaning.' } }
                            ]
                        }

                        if (language) {
                            const languageRecord = await this.prisma.languages.findFirst({
                                where: { code: language }
                            })
                            if (languageRecord) {
                                translationWhere.languageId = languageRecord.id
                            }
                        }

                        const testSetTranslations = await this.prisma.translation.findMany({
                            where: translationWhere,
                            include: {
                                language: true
                            }
                        })

                        if (testSetTranslations.length > 0) {
                            const translation = testSetTranslations.find(t =>
                                t.key.startsWith(nameKey + '.meaning.')
                            )
                            if (translation) {
                                exerciseName = translation.value
                            }
                        } else {
                            exerciseName = attempt.exercise.testSet.name || 'Bài tập'
                        }
                    }

                    // Tính score (for exercises, score = correctAnswers / totalQuestions * 100)
                    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

                    return {
                        id: attempt.id,
                        type: 'EXERCISE' as const,
                        testId: null,
                        testName: null,
                        exerciseId: attempt.exerciseId,
                        exerciseName,
                        status: attempt.status,
                        score,
                        totalQuestions,
                        correctAnswers,
                        incorrectAnswers,
                        time: attempt.time,
                        createdAt: attempt.createdAt,
                        updatedAt: attempt.updatedAt
                    }
                })
            )

            // Merge và sort tất cả history items theo createdAt
            const allHistoryItems = [...testHistoryItems, ...exerciseHistoryItems]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

            // Pagination
            const total = allHistoryItems.length
            const results = allHistoryItems.slice(skip, skip + pageSize)

            // Translate message
            const message = this.i18nService.translate(
                UserHistoryMessage.GET_LIST_SUCCESS,
                normalizedLang
            )

            return {
                statusCode: 200,
                message: message || 'Lấy danh sách lịch sử làm bài thành công',
                data: {
                    results,
                    pagination: {
                        current: currentPage,
                        pageSize,
                        totalPage: Math.ceil(total / pageSize),
                        totalItem: total
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error finding history:', error)
            throw error
        }
    }

    async findAllHistory(query: GetAdminHistoryListQueryType, language?: string): Promise<MessageResDTO> {
        try {
            this.logger.log(`Admin finding all history, type: ${query.type || 'ALL'}, userId: ${query.userId || 'ALL'}`)

            const { currentPage = 1, pageSize = 10, type, status, userId } = query
            const skip = (currentPage - 1) * pageSize
            const normalizedLang = (language || '').toLowerCase().split('-')[0] || 'vi'

            // Build where clause cho test attempts
            const testAttemptWhere: any = {}
            if (userId) {
                testAttemptWhere.userId = userId
            }
            if (status) {
                testAttemptWhere.status = status as TestAttemptStatus
            }

            // Build where clause cho exercise attempts
            const exerciseAttemptWhere: any = {}
            if (userId) {
                exerciseAttemptWhere.userId = userId
            }
            if (status) {
                exerciseAttemptWhere.status = status as ExerciseAttemptStatus
            }

            // Lấy userTestAttempts nếu type là TEST hoặc không filter
            const testAttempts = (type === 'TEST' || !type) ? await this.prisma.userTestAttempt.findMany({
                where: testAttemptWhere,
                include: {
                    test: true,
                    user: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }) : []

            // Lấy userExerciseAttempts nếu type là EXERCISE hoặc không filter
            const exerciseAttempts = (type === 'EXERCISE' || !type) ? await this.prisma.userExerciseAttempt.findMany({
                where: exerciseAttemptWhere,
                include: {
                    exercise: {
                        include: {
                            testSet: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }) : []

            // Map test attempts
            const testHistoryItems = await Promise.all(
                testAttempts.map(async (attempt: any) => {
                    // Lấy answer logs để tính correct/incorrect
                    const answerLogs = await this.prisma.userTestAnswerLog.findMany({
                        where: {
                            userTestAttemptId: attempt.id
                        }
                    })

                    const correctAnswers = answerLogs.filter(log => log.isCorrect).length
                    const incorrectAnswers = answerLogs.filter(log => !log.isCorrect).length
                    const totalQuestions = answerLogs.length

                    // Lấy tên test với i18n
                    let testName = attempt.test.name || ''
                    if (language) {
                        const nameKey = `test.${attempt.test.id}.name`
                        const translationWhere: any = {
                            OR: [
                                { key: nameKey },
                                { key: { startsWith: nameKey + '.meaning.' } }
                            ]
                        }

                        if (language) {
                            const languageRecord = await this.prisma.languages.findFirst({
                                where: { code: language }
                            })
                            if (languageRecord) {
                                translationWhere.languageId = languageRecord.id
                            }
                        }

                        const translations = await this.prisma.translation.findMany({
                            where: translationWhere,
                            include: { language: true },
                            take: 1
                        })

                        if (translations.length > 0) {
                            const translation = translations.find(t => t.key.startsWith(nameKey + '.meaning.'))
                            if (translation) {
                                testName = translation.value
                            }
                        }
                    }

                    return {
                        id: attempt.id,
                        type: 'TEST' as const,
                        testId: attempt.testId,
                        testName,
                        exerciseId: null,
                        exerciseName: null,
                        status: attempt.status,
                        score: attempt.score ? Number(attempt.score) : null,
                        totalQuestions,
                        correctAnswers,
                        incorrectAnswers,
                        time: attempt.time,
                        userId: attempt.userId,
                        user: {
                            id: attempt.user.id,
                            email: attempt.user.email
                        },
                        createdAt: attempt.createdAt,
                        updatedAt: attempt.updatedAt
                    }
                })
            )

            // Map exercise attempts
            const exerciseHistoryItems = await Promise.all(
                exerciseAttempts.map(async (attempt: any) => {
                    // Lấy answer logs để tính correct/incorrect
                    const answerLogs = await this.prisma.userAnswerLog.findMany({
                        where: {
                            userExerciseAttemptId: attempt.id
                        }
                    })

                    const correctAnswers = answerLogs.filter(log => log.isCorrect).length
                    const incorrectAnswers = answerLogs.filter(log => !log.isCorrect).length
                    const totalQuestions = answerLogs.length

                    // Lấy tên exercise
                    let exerciseName = 'Bài tập'
                    if (attempt.exercise?.testSet) {
                        const nameKey = `testset.${attempt.exercise.testSet.id}.name`
                        const translationWhere: any = {
                            OR: [
                                { key: nameKey },
                                { key: { startsWith: nameKey + '.meaning.' } }
                            ]
                        }

                        if (language) {
                            const languageRecord = await this.prisma.languages.findFirst({
                                where: { code: language }
                            })
                            if (languageRecord) {
                                translationWhere.languageId = languageRecord.id
                            }
                        }

                        const testSetTranslations = await this.prisma.translation.findMany({
                            where: translationWhere,
                            include: {
                                language: true
                            }
                        })

                        if (testSetTranslations.length > 0) {
                            const translation = testSetTranslations.find(t =>
                                t.key.startsWith(nameKey + '.meaning.')
                            )
                            if (translation) {
                                exerciseName = translation.value
                            }
                        } else {
                            exerciseName = attempt.exercise.testSet.name || 'Bài tập'
                        }
                    }

                    // Tính score
                    const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0

                    return {
                        id: attempt.id,
                        type: 'EXERCISE' as const,
                        testId: null,
                        testName: null,
                        exerciseId: attempt.exerciseId,
                        exerciseName,
                        status: attempt.status,
                        score,
                        totalQuestions,
                        correctAnswers,
                        incorrectAnswers,
                        time: attempt.time,
                        userId: attempt.userId,
                        user: {
                            id: attempt.user.id,
                            email: attempt.user.email
                        },
                        createdAt: attempt.createdAt,
                        updatedAt: attempt.updatedAt
                    }
                })
            )

            // Merge và sort tất cả history items theo createdAt
            const allHistoryItems = [...testHistoryItems, ...exerciseHistoryItems]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

            // Pagination
            const total = allHistoryItems.length
            const results = allHistoryItems.slice(skip, skip + pageSize)

            // Translate message
            const message = this.i18nService.translate(
                UserHistoryMessage.GET_LIST_SUCCESS,
                normalizedLang
            )

            return {
                statusCode: 200,
                message: message || 'Lấy danh sách lịch sử làm bài thành công',
                data: {
                    results,
                    pagination: {
                        current: currentPage,
                        pageSize,
                        totalPage: Math.ceil(total / pageSize),
                        totalItem: total
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error finding all history (admin):', error)
            throw error
        }
    }
}
