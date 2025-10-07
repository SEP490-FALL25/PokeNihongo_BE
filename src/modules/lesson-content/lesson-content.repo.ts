import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
    CreateLessonContentBodyType,
    UpdateLessonContentBodyType,
    GetLessonContentListQueryType,
} from './entities/lesson-content.entities'

@Injectable()
export class LessonContentRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: GetLessonContentListQueryType) {
        const { page, limit, lessonId, contentType } = params
        const skip = (page - 1) * limit

        const where: any = {}

        if (lessonId) {
            where.lessonId = lessonId
        }

        if (contentType) {
            where.contentType = contentType
        }

        const [data, total] = await Promise.all([
            this.prismaService.lessonContents.findMany({
                where,
                include: {
                    lesson: {
                        select: {
                            id: true,
                            slug: true,
                            titleKey: true,
                        }
                    }
                },
                orderBy: [
                    { contentOrder: 'asc' },
                    { createdAt: 'desc' }
                ],
                skip,
                take: limit,
            }),
            this.prismaService.lessonContents.count({ where })
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
        return this.prismaService.lessonContents.findUnique({
            where: { id },
            include: {
                lesson: {
                    select: {
                        id: true,
                        slug: true,
                        titleKey: true,
                    }
                }
            }
        })
    }

    async create(data: CreateLessonContentBodyType) {
        return this.prismaService.lessonContents.create({
            data,
            include: {
                lesson: {
                    select: {
                        id: true,
                        slug: true,
                        titleKey: true,
                    }
                }
            }
        })
    }

    async update(id: number, data: UpdateLessonContentBodyType) {
        return this.prismaService.lessonContents.update({
            where: { id },
            data,
            include: {
                lesson: {
                    select: {
                        id: true,
                        slug: true,
                        titleKey: true,
                    }
                }
            }
        })
    }

    async delete(id: number) {
        return this.prismaService.lessonContents.delete({
            where: { id }
        })
    }

    // Helper methods
    async checkLessonExists(id: number) {
        const count = await this.prismaService.lesson.count({
            where: { id }
        })
        return count > 0
    }

    async checkContentExists(id: number) {
        const count = await this.prismaService.lessonContents.count({
            where: { id }
        })
        return count > 0
    }

    async getMaxContentOrder(lessonId: number) {
        const result = await this.prismaService.lessonContents.findFirst({
            where: { lessonId },
            orderBy: { contentOrder: 'desc' },
            select: { contentOrder: true }
        })
        return result?.contentOrder ?? -1
    }

    async checkContentExistsInLesson(lessonId: number, contentId: number, contentType: string) {
        const count = await this.prismaService.lessonContents.count({
            where: {
                lessonId,
                contentId,
                contentType
            }
        })
        return count > 0
    }
}
