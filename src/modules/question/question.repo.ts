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
        const { currentPage, pageSize, exercisesId, search, sortBy = QuestionSortField.CREATED_AT, sort = SortOrder.DESC } = params
        const skip = (currentPage - 1) * pageSize

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

        const [items, total] = await Promise.all([
            this.prismaService.question.findMany({
                where,
                include: {
                    exercises: {
                        select: {
                            id: true,
                            exerciseType: true
                        }
                    },
                    answers: true
                },
                orderBy: (
                    () => {
                        const primaryField = (sortBy ?? 'createdAt') as string
                        const direction = (sort ?? 'desc') as 'asc' | 'desc'
                        if (primaryField !== 'id') {
                            return [
                                { [primaryField]: direction } as any,
                                { id: direction } as any
                            ]
                        }
                        return [{ id: direction } as any]
                    }
                )(),
                skip,
                take: pageSize,
            }),
            this.prismaService.question.count({ where })
        ])

        return {
            items,
            total,
            page: currentPage,
            limit: pageSize,
        }
    }

    async findById(id: number) {
        return this.prismaService.question.findUnique({
            where: { id },
            include: {
                exercises: {
                    select: {
                        id: true,
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
    async checkQuestionExistsById(id: number) {
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

    async checkQuestionExists(exercisesId: number, questionJp: string, excludeId?: number) {
        const where: any = {
            exercisesId,
            questionJp
        }

        if (excludeId) {
            where.id = { not: excludeId }
        }

        return this.prismaService.question.findFirst({ where })
    }

    async getNextQuestionOrder(exercisesId: number) {
        const result = await this.prismaService.question.aggregate({
            where: { exercisesId },
            _max: { questionOrder: true }
        })

        return (result._max.questionOrder || 0) + 1
    }
}
