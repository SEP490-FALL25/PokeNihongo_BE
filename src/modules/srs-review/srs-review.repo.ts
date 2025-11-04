import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'

@Injectable()
export class SrsReviewRepository {
    constructor(private readonly prisma: PrismaService) { }

    async list(where: any, take = 200) {
        return (this.prisma as any).userSrsReview.findMany({ where, orderBy: { nextReviewDate: 'asc' }, take })
    }

    async findUnique(userId: number, contentType: string, contentId: number) {
        return (this.prisma as any).userSrsReview.findUnique({
            where: {
                userId_contentType_contentId: { userId, contentType, contentId }
            }
        })
    }

    async upsert(userId: number, contentType: string, contentId: number, message?: string) {
        return (this.prisma as any).userSrsReview.upsert({
            where: {
                userId_contentType_contentId: { userId, contentType, contentId }
            },
            update: { message: message ?? undefined },
            create: { userId, contentType, contentId, message: message || '' }
        })
    }

    async update(userId: number, contentType: string, contentId: number, data: any) {
        return (this.prisma as any).userSrsReview.update({
            where: {
                userId_contentType_contentId: { userId, contentType, contentId }
            },
            data
        })
    }

    async listForDate(userId: number, date: Date) {
        const start = new Date(date)
        start.setHours(0, 0, 0, 0)
        const end = new Date(date)
        end.setHours(23, 59, 59, 999)
        return (this.prisma as any).userSrsReview.findMany({
            where: {
                userId,
                nextReviewDate: { gte: start, lte: end }
            },
            orderBy: [
                { isLeech: 'desc' },
                { incorrectStreak: 'desc' },
                { nextReviewDate: 'asc' }
            ]
        })
    }

    async findById(id: number) {
        return (this.prisma as any).userSrsReview.findUnique({ where: { id } })
    }

    async updateById(id: number, data: any) {
        return (this.prisma as any).userSrsReview.update({ where: { id }, data })
    }
}


