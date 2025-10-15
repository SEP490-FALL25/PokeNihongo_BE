import { UserAnswerLogType } from '@/modules/user-answer-log/entities/user-answer-log.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class UserAnswerLogRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: {
        currentPage: number
        pageSize: number
        userExerciseAttemptId?: number
        questionId?: number
        isCorrect?: boolean
    }) {
        const { currentPage, pageSize, userExerciseAttemptId, questionId, isCorrect } = params
        const skip = (currentPage - 1) * pageSize

        const where: any = {}

        if (userExerciseAttemptId) {
            where.userExerciseAttemptId = userExerciseAttemptId
        }

        if (questionId) {
            where.questionId = questionId
        }

        if (isCorrect !== undefined) {
            where.isCorrect = isCorrect
        }

        const [items, total] = await Promise.all([
            this.prismaService.userAnswerLog.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    userExerciseAttempt: true,
                    question: true,
                    answer: true
                }
            }),
            this.prismaService.userAnswerLog.count({ where })
        ])

        return {
            items: items.map(item => this.transformUserAnswerLog(item)),
            total,
            page: currentPage,
            limit: pageSize
        }
    }

    async findUnique(where: { id?: number }): Promise<UserAnswerLogType | null> {
        if (!where.id) return null

        const result = await this.prismaService.userAnswerLog.findUnique({
            where: { id: where.id },
            include: {
                userExerciseAttempt: true,
                question: true,
                answer: true
            }
        })
        return result ? this.transformUserAnswerLog(result) : null
    }

    async create(data: {
        isCorrect: boolean
        userExerciseAttemptId: number
        questionId: number
        answerId: number
    }): Promise<UserAnswerLogType> {
        const result = await this.prismaService.userAnswerLog.create({
            data
        })
        return this.transformUserAnswerLog(result)
    }

    async update(
        where: { id: number },
        data: {
            isCorrect?: boolean
        }
    ): Promise<UserAnswerLogType> {
        const result = await this.prismaService.userAnswerLog.update({
            where,
            data
        })
        return this.transformUserAnswerLog(result)
    }

    async delete(where: { id: number }): Promise<UserAnswerLogType> {
        const result = await this.prismaService.userAnswerLog.delete({
            where
        })
        return this.transformUserAnswerLog(result)
    }

    async count(where?: any): Promise<number> {
        return this.prismaService.userAnswerLog.count({ where })
    }

    private transformUserAnswerLog(userAnswerLog: any): UserAnswerLogType {
        return {
            id: userAnswerLog.id,
            isCorrect: userAnswerLog.isCorrect,
            userExerciseAttemptId: userAnswerLog.userExerciseAttemptId,
            questionId: userAnswerLog.questionId,
            answerId: userAnswerLog.answerId,
            createdAt: userAnswerLog.createdAt,
            updatedAt: userAnswerLog.updatedAt
        }
    }
}

