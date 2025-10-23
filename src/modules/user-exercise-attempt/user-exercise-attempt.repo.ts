import { UserExerciseAttemptType } from '@/modules/user-exercise-attempt/entities/user-exercise-attempt.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class UserExerciseAttemptRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: {
        currentPage: number
        pageSize: number
        userId?: number
        exerciseId?: number
    }) {
        const { currentPage, pageSize, userId, exerciseId } = params
        const skip = (currentPage - 1) * pageSize

        const where: any = {}

        if (userId) {
            where.userId = userId
        }

        if (exerciseId) {
            where.exerciseId = exerciseId
        }

        const [items, total] = await Promise.all([
            this.prismaService.userExerciseAttempt.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    exercise: true,
                    userAnswerLogs: true
                }
            }),
            this.prismaService.userExerciseAttempt.count({ where })
        ])

        return {
            items: items.map(item => this.transformUserExerciseAttempt(item)),
            total,
            page: currentPage,
            limit: pageSize
        }
    }

    async findUnique(where: { id?: number }): Promise<UserExerciseAttemptType | null> {
        if (!where.id) return null

        const result = await this.prismaService.userExerciseAttempt.findUnique({
            where: { id: where.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                exercise: true,
                userAnswerLogs: true
            }
        })
        return result ? this.transformUserExerciseAttempt(result) : null
    }

    async create(data: {
        userId: number
        exerciseId: number
    }): Promise<UserExerciseAttemptType> {
        const result = await this.prismaService.userExerciseAttempt.create({
            data
        })
        return this.transformUserExerciseAttempt(result)
    }

    async update(
        where: { id: number },
        data: {
            userId?: number
            exerciseId?: number
        }
    ): Promise<UserExerciseAttemptType> {
        const result = await this.prismaService.userExerciseAttempt.update({
            where,
            data
        })
        return this.transformUserExerciseAttempt(result)
    }

    async delete(where: { id: number }): Promise<UserExerciseAttemptType> {
        const result = await this.prismaService.userExerciseAttempt.delete({
            where
        })
        return this.transformUserExerciseAttempt(result)
    }

    async count(where?: any): Promise<number> {
        return this.prismaService.userExerciseAttempt.count({ where })
    }

    private transformUserExerciseAttempt(userExerciseAttempt: any): UserExerciseAttemptType {
        return {
            id: userExerciseAttempt.id,
            userId: userExerciseAttempt.userId,
            exerciseId: userExerciseAttempt.exerciseId,
            createdAt: userExerciseAttempt.createdAt,
            updatedAt: userExerciseAttempt.updatedAt
        }
    }
}


