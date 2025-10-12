import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
    CreateQuestionBodyType,
    UpdateQuestionBodyType,
    GetQuestionListQueryType,
} from './entities/question.entities'
import { QuestionSortField, SortOrder } from '@/common/enum/enum'

@Injectable()
export class QuestionRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: GetQuestionListQueryType) {
        const { page, limit, exercisesId, search, sortBy = QuestionSortField.CREATED_AT, sort = SortOrder.DESC } = params
        const skip = (page - 1) * limit

        const where: any = {}

        if (exercisesId) {
            where.exercisesId = exercisesId
        }

        if (search) {
            where.questionJp = {
                contains: search,
                mode: 'insensitive'
            }
        }

        const [data, total] = await Promise.all([
            this.prismaService.question.findMany({
                where,
                include: {
                    exercises: {
                        select: {
                            id: true,
                            titleJp: true,
                            titleKey: true,
                            exerciseType: true
                        }
                    },
                    answers: true
                },
                orderBy: { [sortBy]: sort },
                skip,
                take: limit,
            }),
            this.prismaService.question.count({ where })
        ])

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }
    }

    async findById(id: number) {
        return this.prismaService.question.findUnique({
            where: { id },
            include: {
                exercises: {
                    select: {
                        id: true,
                        titleJp: true,
                        titleKey: true,
                        exerciseType: true
                    }
                },
                answers: {
                    orderBy: {
                        id: 'asc'
                    }
                }
            }
        })
    }

    async create(data: any) {
        return this.prismaService.question.create({
            data,
            include: {
                exercises: {
                    select: {
                        id: true,
                        titleJp: true,
                        titleKey: true,
                        exerciseType: true
                    }
                }
            }
        })
    }

    async update(id: number, data: any) {
        return this.prismaService.question.update({
            where: { id },
            data,
            include: {
                exercises: {
                    select: {
                        id: true,
                        titleJp: true,
                        titleKey: true,
                        exerciseType: true
                    }
                },
                answers: {
                    orderBy: {
                        id: 'asc'
                    }
                }
            }
        })
    }

    async delete(id: number) {
        return this.prismaService.question.delete({
            where: { id }
        })
    }

    // Helper methods
    async checkQuestionExists(id: number) {
        const count = await this.prismaService.question.count({
            where: { id }
        })
        return count > 0
    }

    async checkExercisesExists(exercisesId: number) {
        const count = await this.prismaService.exercises.count({
            where: { id: exercisesId }
        })
        return count > 0
    }

    async checkQuestionKeyExists(questionKey: string, excludeId?: number) {
        const where: any = { questionKey }
        if (excludeId) {
            where.id = { not: excludeId }
        }

        const count = await this.prismaService.question.count({ where })
        return count > 0
    }
}
