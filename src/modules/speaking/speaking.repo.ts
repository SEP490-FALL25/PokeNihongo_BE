import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { UserSpeakingAttemptType, CreateUserSpeakingAttemptType, UpdateUserSpeakingAttemptType, GetUserSpeakingAttemptListQueryType } from './entities/speaking.entities'

@Injectable()
export class SpeakingRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: CreateUserSpeakingAttemptType & { userId: number }): Promise<UserSpeakingAttemptType> {
        return await this.prisma.userSpeakingAttempt.create({
            data: {
                ...data,
                userId: data.userId,
            },
        })
    }

    async findById(id: number): Promise<UserSpeakingAttemptType | null> {
        return await this.prisma.userSpeakingAttempt.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                questionBank: {
                    select: {
                        id: true,
                        questionJp: true,
                        questionType: true,
                        pronunciation: true,
                        role: true,
                        levelN: true,
                    },
                },
            },
        })
    }

    async findMany(query: GetUserSpeakingAttemptListQueryType): Promise<{ data: UserSpeakingAttemptType[]; total: number }> {
        const { currentPage, pageSize, userId, questionBankId, minScore, maxScore, search } = query
        const skip = (currentPage - 1) * pageSize

        const where: any = {}

        if (userId) {
            where.userId = userId
        }

        if (questionBankId) {
            where.questionBankId = questionBankId
        }

        if (minScore !== undefined || maxScore !== undefined) {
            where.overallScore = {}
            if (minScore !== undefined) {
                where.overallScore.gte = minScore
            }
            if (maxScore !== undefined) {
                where.overallScore.lte = maxScore
            }
        }

        if (search) {
            where.OR = [
                { userTranscription: { contains: search, mode: 'insensitive' } },
                { questionBank: { questionJp: { contains: search, mode: 'insensitive' } } },
            ]
        }

        const [data, total] = await Promise.all([
            this.prisma.userSpeakingAttempt.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    questionBank: {
                        select: {
                            id: true,
                            questionJp: true,
                            questionType: true,
                            pronunciation: true,
                            role: true,
                            levelN: true,
                        },
                    },
                },
            }),
            this.prisma.userSpeakingAttempt.count({ where }),
        ])

        return { data, total }
    }

    async update(id: number, data: UpdateUserSpeakingAttemptType): Promise<UserSpeakingAttemptType> {
        return await this.prisma.userSpeakingAttempt.update({
            where: { id },
            data,
        })
    }

    async delete(id: number): Promise<UserSpeakingAttemptType> {
        return await this.prisma.userSpeakingAttempt.delete({
            where: { id },
        })
    }

    async findByUserId(userId: number): Promise<UserSpeakingAttemptType[]> {
        return await this.prisma.userSpeakingAttempt.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            include: {
                questionBank: {
                    select: {
                        id: true,
                        questionJp: true,
                        questionType: true,
                        pronunciation: true,
                        levelN: true,
                    },
                },
            },
        })
    }

    async findByQuestionBankId(questionBankId: number): Promise<UserSpeakingAttemptType[]> {
        return await this.prisma.userSpeakingAttempt.findMany({
            where: { questionBankId },
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })
    }

    async getStatistics(userId?: number): Promise<any> {
        const where = userId ? { userId } : {}

        const [
            totalAttempts,
            averageScore,
            bestScore,
            attemptsByLevel,
            attemptsByType,
            recentAttempts
        ] = await Promise.all([
            this.prisma.userSpeakingAttempt.count({ where }),
            this.prisma.userSpeakingAttempt.aggregate({
                where: { ...where, overallScore: { not: null } },
                _avg: { overallScore: true },
            }),
            this.prisma.userSpeakingAttempt.aggregate({
                where: { ...where, overallScore: { not: null } },
                _max: { overallScore: true },
            }),
            this.prisma.userSpeakingAttempt.groupBy({
                by: ['questionBankId'],
                where,
                _count: { questionBankId: true },
            }),
            this.prisma.userSpeakingAttempt.groupBy({
                by: ['questionBankId'],
                where,
                _count: { questionBankId: true },
            }),
            this.prisma.userSpeakingAttempt.findMany({
                where,
                take: 5,
                orderBy: { createdAt: 'desc' },
                include: {
                    questionBank: {
                        select: {
                            id: true,
                            questionJp: true,
                            questionType: true,
                            pronunciation: true,
                            role: true,
                            levelN: true,
                        },
                    },
                },
            }),
        ])

        return {
            totalAttempts,
            averageScore: averageScore._avg.overallScore || 0,
            bestScore: bestScore._max.overallScore || 0,
            attemptsByLevel: attemptsByLevel.reduce((acc, item) => {
                const level = `N${item.questionBankId}`
                acc[level] = (acc[level] || 0) + item._count.questionBankId
                return acc
            }, {}),
            attemptsByType: attemptsByType.reduce((acc, item) => {
                const type = item.questionBankId
                acc[type] = (acc[type] || 0) + item._count.questionBankId
                return acc
            }, {}),
            recentAttempts,
        }
    }
}
