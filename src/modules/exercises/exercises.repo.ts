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
        const { currentPage, pageSize, exerciseType, lessonId, isBlocked, search, sortBy, sort } = params
        const skip = (currentPage - 1) * pageSize

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
                    content: {
                        contains: search,
                        mode: 'insensitive'
                    }
                }
            ]
        }

        const [items, total] = await Promise.all([
            this.prismaService.exercises.findMany({
                where,
                include: {
                    lesson: {
                        select: {
                            id: true,
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
                orderBy: (
                    () => {
                        const primaryField = (sortBy ?? 'createdAt') as string
                        const direction = (sort ?? 'desc') as 'asc' | 'desc'
                        // Add secondary sort by id to ensure stable ordering when primary values are equal
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
            this.prismaService.exercises.count({ where })
        ])

        return {
            items,
            total,
            page: currentPage,
            limit: pageSize,
        }
    }

    async findById(id: number) {
        return this.prismaService.exercises.findUnique({
            where: { id },
            include: {
                lesson: {
                    select: {
                        id: true,
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

    async updatePartial(id: number, data: any) {
        // Remove undefined values
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value !== undefined)
        )

        return this.prismaService.exercises.update({
            where: { id },
            data: cleanData,
            include: {
                lesson: {
                    select: {
                        id: true,
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

}
