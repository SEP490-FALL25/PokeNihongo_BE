import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { ExerciseAttemptStatus } from '@prisma/client'

@Injectable()
export class UserHistoryRepository {
    constructor(private readonly prisma: PrismaService) { }

    async findRecentExerciseAttempts(params: {
        userId: number
        status?: ExerciseAttemptStatus
    }) {
        const { userId, status } = params

        const exerciseWhere: any = { userId }
        if (status) {
            exerciseWhere.status = status
        }

        return this.prisma.userExerciseAttempt.findMany({
            where: exerciseWhere,
            include: {
                exercise: {
                    include: {
                        testSet: true,
                        lesson: true
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        })
    }
}

