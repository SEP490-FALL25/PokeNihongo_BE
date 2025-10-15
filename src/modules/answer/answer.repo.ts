import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
    CreateAnswerBodyType,
    UpdateAnswerBodyType,
    GetAnswerListQueryType,
} from './entities/answer.entities'
import { AnswerSortField, SortOrder } from '@/common/enum/enum'

@Injectable()
export class AnswerRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: GetAnswerListQueryType) {
        const { currentPage, pageSize, questionId, isCorrect, search, sortBy = AnswerSortField.CREATED_AT, sort = SortOrder.DESC } = params
        const skip = (currentPage - 1) * pageSize

        const where: any = {}

        if (questionId) {
            where.questionId = questionId
        }

        if (isCorrect !== undefined) {
            where.isCorrect = isCorrect
        }

        if (search) {
            where.answerJp = {
                contains: search,
                mode: 'insensitive'
            }
        }

        const [data, total] = await Promise.all([
            this.prismaService.answer.findMany({
                where,
                include: {
                    question: {
                        select: {
                            id: true,
                            questionJp: true,
                            questionKey: true,
                            questionOrder: true
                        }
                    }
                },
                orderBy: { [sortBy]: sort },
                skip,
                take: pageSize,
            }),
            this.prismaService.answer.count({ where })
        ])

        return {
            data,
            total,
            currentPage,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        }
    }

    async findById(id: number) {
        return this.prismaService.answer.findUnique({
            where: { id },
            include: {
                question: {
                    select: {
                        id: true,
                        questionJp: true,
                        questionKey: true,
                        questionOrder: true
                    }
                }
            }
        })
    }

    async create(data: any) {
        return this.prismaService.answer.create({
            data,
            include: {
                question: {
                    select: {
                        id: true,
                        questionJp: true,
                        questionKey: true,
                        questionOrder: true
                    }
                }
            }
        })
    }

    async update(id: number, data: UpdateAnswerBodyType) {
        return this.prismaService.answer.update({
            where: { id },
            data,
            include: {
                question: {
                    select: {
                        id: true,
                        questionJp: true,
                        questionKey: true,
                        questionOrder: true
                    }
                }
            }
        })
    }

    async delete(id: number) {
        return this.prismaService.answer.delete({
            where: { id }
        })
    }

    // Helper methods

    async checkAnswerKeyExists(answerKey: string, excludeId?: number) {
        const where: any = { answerKey }
        if (excludeId) {
            where.id = { not: excludeId }
        }

        const count = await this.prismaService.answer.count({ where })
        return count > 0
    }

    async checkAnswerExistsById(id: number) {
        const count = await this.prismaService.answer.count({ where: { id } })
        return count > 0
    }

    async checkAnswerExists(questionId: number, answerJp: string, excludeId?: number) {
        const where: any = {
            questionId,
            answerJp
        }
        if (excludeId) {
            where.id = { not: excludeId }
        }
        return this.prismaService.answer.findFirst({ where })
    }

    async checkQuestionExists(questionId: number) {
        const count = await this.prismaService.question.count({ where: { id: questionId } })
        return count > 0
    }
}
