import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { GetHistoryListQueryType, GetAdminHistoryListQueryType, GetRecentLessonsQueryType } from './entities/user-history.entities'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TestAttemptStatus, ExerciseAttemptStatus, ProgressStatus } from '@prisma/client'
import { I18nService } from '@/i18n/i18n.service'
import { UserHistoryMessage } from '@/i18n/message-keys'
import { TranslationService } from '@/modules/translation/translation.service'
import { LanguagesService } from '@/modules/languages/languages.service'

@Injectable()
export class UserHistoryService {
    private readonly logger = new Logger(UserHistoryService.name)

    constructor(
        private readonly prisma: PrismaService,
        private readonly i18nService: I18nService,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService
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

    async findRecentLessons(userId: number, query: GetRecentLessonsQueryType, language?: string): Promise<MessageResDTO> {
        try {
            this.logger.log(`Finding recent lessons for user ${userId}, status: ${query.status || 'ALL'}`)

            const { currentPage = 1, pageSize = 10, status } = query
            const skip = (currentPage - 1) * pageSize
            const normalizedLang = (language || '').toLowerCase().split('-')[0] || 'vi'

            // Lấy languageId
            let languageId: number | undefined
            try {
                const languageRecord = await this.languagesService.findByCode({ code: normalizedLang })
                languageId = languageRecord?.data?.id
            } catch (error) {
                this.logger.warn(`Failed to find language for code ${normalizedLang}:`, error)
            }

            // Build where clause cho UserProgress
            const progressWhere: any = {
                userId,
                status: {
                    in: status ? [status as ProgressStatus] : ['IN_PROGRESS', 'COMPLETED'] as ProgressStatus[]
                }
            }

            // Lấy UserProgress (Lessons)
            const userProgresses = await this.prisma.userProgress.findMany({
                where: progressWhere,
                include: {
                    lesson: {
                        include: {
                            lessonCategory: true
                        }
                    }
                },
                orderBy: {
                    lastAccessedAt: 'desc'
                }
            })

            // Build where clause cho UserExerciseAttempt
            // Chỉ lấy IN_PROGRESS và COMPLETED (bỏ qua FAIL, ABANDONED, SKIPPED)
            const exerciseStatusFilter: ExerciseAttemptStatus[] = status
                ? [status === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'COMPLETED']
                : ['IN_PROGRESS', 'COMPLETED']

            const exerciseWhere: any = {
                userId,
                status: {
                    in: exerciseStatusFilter
                }
            }

            // Lấy UserExerciseAttempt (Exercises)
            const exerciseAttempts = await this.prisma.userExerciseAttempt.findMany({
                where: exerciseWhere,
                include: {
                    exercise: {
                        include: {
                            testSet: true,
                            lesson: {
                                include: {
                                    lessonCategory: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    updatedAt: 'desc'
                }
            })

            // Map UserProgress to RecentLessonItem
            const lessonItems = await Promise.all(
                userProgresses.map(async (progress: any) => {
                    // Lấy translation cho lesson title
                    let lessonTitle = progress.lesson.titleJp || ''
                    if (progress.lesson.titleKey && languageId) {
                        try {
                            const translation = await this.translationService.findByKeyAndLanguage(
                                progress.lesson.titleKey,
                                languageId
                            )
                            if (translation?.value) {
                                lessonTitle = translation.value
                            }
                        } catch (error) {
                            this.logger.warn(`Failed to get translation for ${progress.lesson.titleKey}:`, error)
                        }
                    }

                    // Lấy translation cho lesson category name
                    let categoryName = ''
                    if (progress.lesson.lessonCategory?.nameKey && languageId) {
                        try {
                            const translation = await this.translationService.findByKeyAndLanguage(
                                progress.lesson.lessonCategory.nameKey,
                                languageId
                            )
                            if (translation?.value) {
                                categoryName = translation.value
                            }
                        } catch (error) {
                            this.logger.warn(`Failed to get translation for category ${progress.lesson.lessonCategory.nameKey}:`, error)
                        }
                    }

                    return {
                        id: progress.id,
                        type: 'LESSON' as const,
                        lessonId: progress.lessonId,
                        lessonTitle,
                        lessonSlug: progress.lesson.slug,
                        lessonCategoryName: categoryName || progress.lesson.lessonCategory?.nameKey || '',
                        exerciseId: null,
                        exerciseName: null,
                        status: progress.status,
                        progressPercentage: progress.progressPercentage,
                        lastAccessedAt: progress.lastAccessedAt,
                        completedAt: progress.completedAt,
                        updatedAt: progress.updatedAt
                    }
                })
            )

            // Map UserExerciseAttempt to RecentLessonItem
            const exerciseItems = await Promise.all(
                exerciseAttempts.map(async (attempt: any) => {
                    // Lấy tên exercise từ testSet
                    let exerciseName = 'Bài tập'
                    if (attempt.exercise?.testSet) {
                        const nameKey = `testset.${attempt.exercise.testSet.id}.name`
                        if (languageId) {
                            try {
                                const translation = await this.translationService.findByKeyAndLanguage(
                                    nameKey,
                                    languageId
                                )
                                if (translation?.value) {
                                    exerciseName = translation.value
                                }
                            } catch (error) {
                                this.logger.warn(`Failed to get translation for testset ${nameKey}:`, error)
                            }
                        }
                        if (exerciseName === 'Bài tập' && attempt.exercise.testSet.name) {
                            exerciseName = attempt.exercise.testSet.name
                        }
                    }

                    // Lấy lesson info nếu có
                    let lessonTitle: string | null = null
                    let lessonSlug: string | null = null
                    let categoryName: string | null = null

                    if (attempt.exercise?.lesson) {
                        const lesson = attempt.exercise.lesson
                        lessonSlug = lesson.slug

                        if (lesson.titleKey && languageId) {
                            try {
                                const translation = await this.translationService.findByKeyAndLanguage(
                                    lesson.titleKey,
                                    languageId
                                )
                                if (translation?.value) {
                                    lessonTitle = translation.value
                                }
                            } catch (error) {
                                this.logger.warn(`Failed to get translation for lesson ${lesson.titleKey}:`, error)
                            }
                        }
                        if (!lessonTitle) {
                            lessonTitle = lesson.titleJp || null
                        }

                        // Lấy category name nếu có
                        if (lesson.lessonCategory?.nameKey && languageId) {
                            try {
                                const categoryTranslation = await this.translationService.findByKeyAndLanguage(
                                    lesson.lessonCategory.nameKey,
                                    languageId
                                )
                                if (categoryTranslation?.value) {
                                    categoryName = categoryTranslation.value
                                }
                            } catch (error) {
                                this.logger.warn(`Failed to get translation for category ${lesson.lessonCategory.nameKey}:`, error)
                            }
                        }
                        if (!categoryName && lesson.lessonCategory?.nameKey) {
                            categoryName = lesson.lessonCategory.nameKey
                        }
                    }

                    return {
                        id: attempt.id,
                        type: 'EXERCISE' as const,
                        lessonId: attempt.exercise?.lessonId || null,
                        lessonTitle,
                        lessonSlug,
                        lessonCategoryName: categoryName,
                        exerciseId: attempt.exerciseId,
                        exerciseName,
                        status: attempt.status, // Đã filter ở where clause nên chỉ có IN_PROGRESS hoặc COMPLETED
                        progressPercentage: null,
                        lastAccessedAt: null,
                        completedAt: attempt.status === 'COMPLETED' ? attempt.updatedAt : null,
                        updatedAt: attempt.updatedAt
                    }
                })
            )

            // Merge và sort tất cả items theo thời gian gần đây nhất
            // Ưu tiên lastAccessedAt cho lesson, updatedAt cho exercise
            const allItems = [...lessonItems, ...exerciseItems].sort((a, b) => {
                const timeA = a.lastAccessedAt || a.updatedAt
                const timeB = b.lastAccessedAt || b.updatedAt
                return new Date(timeB).getTime() - new Date(timeA).getTime()
            })

            // Pagination
            const total = allItems.length
            const results = allItems.slice(skip, skip + pageSize)

            // Translate message
            const message = this.i18nService.translate(
                UserHistoryMessage.GET_LIST_SUCCESS,
                normalizedLang
            )

            return {
                statusCode: 200,
                message: message || 'Lấy danh sách bài học gần đây thành công',
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
            this.logger.error('Error finding recent lessons:', error)
            throw error
        }
    }
}
