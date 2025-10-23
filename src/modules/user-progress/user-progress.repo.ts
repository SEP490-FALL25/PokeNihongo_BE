import { UserProgressType } from '@/modules/user-progress/entities/user-progress.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class UserProgressRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: {
        currentPage: number
        pageSize: number
        userId?: number
        lessonId?: number
        lessonCategoryId?: number
        status?: string
        progressPercentage?: number
    }) {
        const { currentPage, pageSize, userId, lessonId, lessonCategoryId, status, progressPercentage } = params
        const skip = (currentPage - 1) * pageSize

        const where: any = {}

        if (userId) {
            where.userId = userId
        }

        if (lessonId) {
            where.lessonId = lessonId
        }

        if (lessonCategoryId) {
            where.lesson = {
                lessonCategoryId: lessonCategoryId
            }
        }

        if (status) {
            where.status = status
        }

        if (progressPercentage !== undefined) {
            where.progressPercentage = progressPercentage
        }

        const [items, total] = await Promise.all([
            this.prismaService.userProgress.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { updatedAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    lesson: {
                        select: {
                            id: true,
                            slug: true,
                            titleJp: true,
                            titleKey: true,
                            levelJlpt: true,
                            estimatedTimeMinutes: true,
                            lessonCategoryId: true,
                            lessonCategory: {
                                select: {
                                    id: true,
                                    nameKey: true
                                }
                            }
                        }
                    }
                }
            }),
            this.prismaService.userProgress.count({ where })
        ])

        return {
            items: items.map(item => this.transformUserProgress(item)),
            total,
            page: currentPage,
            limit: pageSize
        }
    }

    async findUnique(where: { id?: number }): Promise<UserProgressType | null> {
        if (!where.id) return null

        const result = await this.prismaService.userProgress.findUnique({
            where: { id: where.id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                lesson: {
                    select: {
                        id: true,
                        slug: true,
                        titleJp: true,
                        titleKey: true,
                        levelJlpt: true,
                        estimatedTimeMinutes: true
                    }
                }
            }
        })
        return result ? this.transformUserProgress(result) : null
    }

    async findByUserAndLesson(userId: number, lessonId: number): Promise<UserProgressType | null> {
        const result = await this.prismaService.userProgress.findUnique({
            where: {
                userId_lessonId: {
                    userId,
                    lessonId
                }
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                },
                lesson: {
                    select: {
                        id: true,
                        slug: true,
                        titleJp: true,
                        titleKey: true,
                        levelJlpt: true,
                        estimatedTimeMinutes: true
                    }
                }
            }
        })
        return result ? this.transformUserProgress(result) : null
    }

    async create(data: {
        userId: number
        lessonId: number
        status?: string
        progressPercentage?: number
    }): Promise<UserProgressType> {
        const result = await this.prismaService.userProgress.create({
            data: {
                userId: data.userId,
                lessonId: data.lessonId,
                status: (data.status || 'NOT_STARTED') as any,
                progressPercentage: data.progressPercentage || 0
            }
        })
        return this.transformUserProgress(result)
    }

    async update(
        where: { id: number },
        data: {
            status?: string
            progressPercentage?: number
        }
    ): Promise<UserProgressType> {
        const updateData: any = { ...data }

        // Nếu status được cập nhật thành COMPLETED, set completedAt
        if (data.status === 'COMPLETED') {
            updateData.completedAt = new Date()
        }

        // Cập nhật lastAccessedAt
        updateData.lastAccessedAt = new Date()

        const result = await this.prismaService.userProgress.update({
            where,
            data: updateData
        })
        return this.transformUserProgress(result)
    }

    async updateByUserAndLesson(
        userId: number,
        lessonId: number,
        data: {
            status?: string
            progressPercentage?: number
        }
    ): Promise<UserProgressType> {
        const updateData: any = { ...data }

        // Nếu status được cập nhật thành COMPLETED, set completedAt
        if (data.status === 'COMPLETED') {
            updateData.completedAt = new Date()
        }

        // Cập nhật lastAccessedAt
        updateData.lastAccessedAt = new Date()

        const result = await this.prismaService.userProgress.update({
            where: {
                userId_lessonId: {
                    userId,
                    lessonId
                }
            },
            data: updateData
        })
        return this.transformUserProgress(result)
    }

    async delete(where: { id: number }): Promise<UserProgressType> {
        const result = await this.prismaService.userProgress.delete({
            where
        })
        return this.transformUserProgress(result)
    }

    async count(where?: any): Promise<number> {
        return this.prismaService.userProgress.count({ where })
    }

    async upsert(
        userId: number,
        lessonId: number,
        data: {
            status?: string
            progressPercentage?: number
        }
    ): Promise<UserProgressType> {
        const result = await this.prismaService.userProgress.upsert({
            where: {
                userId_lessonId: {
                    userId,
                    lessonId
                }
            },
            update: {
                status: (data.status || 'NOT_STARTED') as any,
                progressPercentage: data.progressPercentage || 0,
                lastAccessedAt: new Date()
            },
            create: {
                userId,
                lessonId,
                status: (data.status || 'NOT_STARTED') as any,
                progressPercentage: data.progressPercentage || 0
            }
        })
        return this.transformUserProgress(result)
    }

    /**
     * Lấy tất cả lesson có trong hệ thống
     */
    async getAllLessons(): Promise<{ id: number }[]> {
        return await this.prismaService.lesson.findMany({
            select: {
                id: true
            },
            orderBy: {
                id: 'asc'
            }
        })
    }

    /**
     * Lấy tất cả user có trong hệ thống
     */
    async getAllUsers(): Promise<{ id: number }[]> {
        return await this.prismaService.user.findMany({
            select: {
                id: true
            },
            orderBy: {
                id: 'asc'
            }
        })
    }

    /**
     * Tạo hàng loạt UserProgress
     */
    async bulkCreate(data: Array<{
        userId: number
        lessonId: number
        status: string
        progressPercentage: number
    }>): Promise<void> {
        await this.prismaService.userProgress.createMany({
            data: data.map(item => ({
                userId: item.userId,
                lessonId: item.lessonId,
                status: item.status as any,
                progressPercentage: item.progressPercentage
            })),
            skipDuplicates: true // Bỏ qua nếu đã tồn tại
        })
    }

    private transformUserProgress(userProgress: any): any {
        return {
            id: userProgress.id,
            userId: userProgress.userId,
            lessonId: userProgress.lessonId,
            status: userProgress.status,
            progressPercentage: userProgress.progressPercentage,
            completedAt: userProgress.completedAt,
            lastAccessedAt: userProgress.lastAccessedAt,
            createdAt: userProgress.createdAt,
            updatedAt: userProgress.updatedAt,
            user: userProgress.user ? {
                id: userProgress.user.id,
                name: userProgress.user.name,
                email: userProgress.user.email
            } : undefined,
            lesson: userProgress.lesson ? {
                id: userProgress.lesson.id,
                titleJp: userProgress.lesson.titleJp,
                levelJlpt: userProgress.lesson.levelJlpt,
                isPublished: true
            } : undefined
        }
    }
}