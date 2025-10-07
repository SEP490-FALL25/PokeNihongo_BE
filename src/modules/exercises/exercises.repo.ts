import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
    CreateExercisesBodyType,
    UpdateExercisesBodyType,
    GetExercisesListQueryType,
} from './entities/exercises.entities'

@Injectable()
export class ExercisesRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: GetExercisesListQueryType) {
        const { page, limit, exerciseType, lessonId, isBlocked, search } = params
        const skip = (page - 1) * limit

        const where: any = {}

        if (exerciseType) {
            where.exerciseType = exerciseType
        }

        if (lessonId) {
            where.lessonId = lessonId
        }

        if (isBlocked !== undefined) {
            where.isBlocked = isBlocked
        }

        if (search) {
            where.OR = [
                {
                    titleJp: {
                        contains: search,
                        mode: 'insensitive'
                    }
                },
                {
                    content: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            ]
        }

        const [data, total] = await Promise.all([
            this.prismaService.exercises.findMany({
                where,
                include: {
                    lesson: {
                        select: {
                            id: true,
                            titleJp: true,
                            titleKey: true,
                            slug: true
                        }
                    },
                    questions: {
                        include: {
                            answers: true
                        }
                    }
                },
                orderBy: [
                    { createdAt: 'desc' }
                ],
                skip,
                take: limit,
            }),
            this.prismaService.exercises.count({ where })
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
        return this.prismaService.exercises.findUnique({
            where: { id },
            include: {
                lesson: {
                    select: {
                        id: true,
                        titleJp: true,
                        titleKey: true,
                        slug: true
                    }
                },
                questions: {
                    include: {
                        answers: true
                    },
                    orderBy: {
                        questionOrder: 'asc'
                    }
                }
            }
        })
    }

    async create(data: any) {
        return this.prismaService.exercises.create({
            data,
            include: {
                lesson: {
                    select: {
                        id: true,
                        titleJp: true,
                        titleKey: true,
                        slug: true
                    }
                }
            }
        })
    }

    async update(id: number, data: any) {
        return this.prismaService.exercises.update({
            where: { id },
            data,
            include: {
                lesson: {
                    select: {
                        id: true,
                        titleJp: true,
                        titleKey: true,
                        slug: true
                    }
                },
                questions: {
                    include: {
                        answers: true
                    },
                    orderBy: {
                        questionOrder: 'asc'
                    }
                }
            }
        })
    }

    async delete(id: number) {
        return this.prismaService.exercises.delete({
            where: { id }
        })
    }

    // Helper methods
    async checkExercisesExists(id: number) {
        const count = await this.prismaService.exercises.count({
            where: { id }
        })
        return count > 0
    }

    async checkLessonExists(lessonId: number) {
        const count = await this.prismaService.lesson.count({
            where: { id: lessonId }
        })
        return count > 0
    }

    async checkTitleKeyExists(titleKey: string, excludeId?: number) {
        const where: any = { titleKey }
        if (excludeId) {
            where.id = { not: excludeId }
        }

        const count = await this.prismaService.exercises.count({ where })
        return count > 0
    }
}
