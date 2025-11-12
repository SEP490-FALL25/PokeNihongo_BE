import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
    CreateLessonBodyType,
    UpdateLessonBodyType,
    GetLessonListQueryType,
} from './entities/lesson.entities'
import { LessonSortField, SortOrder } from '@/common/enum/enum'

@Injectable()
export class LessonRepository {
    constructor(private readonly prismaService: PrismaService) { }

    // Lesson CRUD
    async findMany(params: GetLessonListQueryType) {
        const { currentPage, pageSize, search, lessonCategoryId, levelJlpt, isPublished, sortBy = LessonSortField.CREATED_AT, sort = SortOrder.DESC } = params
        const skip = (currentPage - 1) * pageSize

        const where: any = {}

        if (search) {
            where.OR = [
                { slug: { contains: search, mode: 'insensitive' } },
                { titleKey: { contains: search, mode: 'insensitive' } },
            ]
        }

        if (lessonCategoryId) {
            where.lessonCategoryId = lessonCategoryId
        }

        if (levelJlpt) {
            where.levelJlpt = levelJlpt
        }

        if (typeof isPublished === 'boolean') {
            where.isPublished = isPublished
        }

        const [data, total] = await Promise.all([
            this.prismaService.lesson.findMany({
                where,
                include: {
                    lessonCategory: {
                        select: {
                            id: true,
                            nameKey: true,
                            slug: true,
                        }
                    },
                    reward: true,
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                },
                orderBy: { [sortBy]: sort },
                skip,
                take: pageSize,
            }),
            this.prismaService.lesson.count({ where })
        ])

        return {
            data,
            total,
            page: currentPage,
            limit: pageSize,
            totalPages: Math.ceil(total / pageSize),
        }
    }

    async findById(id: number) {
        return this.prismaService.lesson.findUnique({
            where: { id },
            include: {
                lessonCategory: {
                    select: {
                        id: true,
                        nameKey: true,
                        slug: true,
                    }
                },
                reward: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
            }
        })
    }

    async findBySlug(slug: string) {
        return this.prismaService.lesson.findUnique({
            where: { slug },
            include: {
                lessonCategory: {
                    select: {
                        id: true,
                        nameKey: true,
                        slug: true,
                    }
                },
                reward: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
            }
        })
    }

    async create(data: CreateLessonBodyType & { createdById: number, slug: string, titleKey: string }) {
        return this.prismaService.lesson.create({
            data: {
                ...data,
                publishedAt: data.isPublished ? new Date() : null,
            },
            include: {
                lessonCategory: {
                    select: {
                        id: true,
                        nameKey: true,
                        slug: true,
                    }
                },
                reward: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
            }
        })
    }

    async update(id: number, data: UpdateLessonBodyType) {
        const updateData: any = { ...data }

        // Xử lý publishedAt dựa trên isPublished
        if (data.isPublished !== undefined) {
            if (data.isPublished === true) {
                // Publish: set publishedAt nếu chưa có
                const existingLesson = await this.prismaService.lesson.findUnique({
                    where: { id },
                    select: { isPublished: true, publishedAt: true }
                })

                if (existingLesson && !existingLesson.isPublished && !existingLesson.publishedAt) {
                    updateData.publishedAt = new Date()
                }
            } else if (data.isPublished === false) {
                // Unpublish: clear publishedAt
                updateData.publishedAt = null
            }
        }

        return this.prismaService.lesson.update({
            where: { id },
            data: updateData,
            include: {
                lessonCategory: {
                    select: {
                        id: true,
                        nameKey: true,
                        slug: true,
                    }
                },
                reward: true,
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                },
            }
        })
    }

    async delete(id: number) {
        return this.prismaService.lesson.delete({
            where: { id }
        })
    }


    // Helper methods

    async checkRewardExists(id: number) {
        const count = await this.prismaService.reward.count({
            where: { id }
        })
        return count > 0
    }

    async checkLessonExists(id: number) {
        const count = await this.prismaService.lesson.count({
            where: { id }
        })
        return count > 0
    }

    async checkSlugExists(slug: string, excludeId?: number) {
        const where: any = { slug }
        if (excludeId) {
            where.id = { not: excludeId }
        }

        const count = await this.prismaService.lesson.count({ where })
        return count > 0
    }

    async getMaxLessonOrderByCategory(lessonCategoryId: number): Promise<number> {
        const result = await this.prismaService.lesson.findFirst({
            where: { lessonCategoryId },
            orderBy: { lessonOrder: 'desc' },
            select: { lessonOrder: true }
        })
        return result?.lessonOrder ?? 0
    }
}
