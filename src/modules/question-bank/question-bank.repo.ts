import { QuestionBankType, QuestionBankStatusEnum } from '@/modules/question-bank/entities/question-bank.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class QuestionBankRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: {
        currentPage: number
        pageSize: number
        levelN?: number
        bankType?: string
        status?: QuestionBankStatusEnum
        search?: string
    }) {
        const { currentPage, pageSize, levelN, bankType, status, search } = params
        const skip = (currentPage - 1) * pageSize

        const where: any = {}

        if (levelN) {
            where.levelN = levelN
        }

        if (bankType) {
            where.bankType = bankType
        }

        if (status) {
            where.status = status
        }

        if (search) {
            where.OR = [
                { bankType: { contains: search, mode: 'insensitive' } }
            ]
        }

        const [items, total] = await Promise.all([
            this.prismaService.question_Bank.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    question: true,
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            }),
            this.prismaService.question_Bank.count({ where })
        ])

        return {
            items: items.map(item => this.transformQuestionBank(item)),
            total,
            page: currentPage,
            limit: pageSize
        }
    }

    async findUnique(where: { id?: number }): Promise<QuestionBankType | null> {
        if (!where.id) return null

        const result = await this.prismaService.question_Bank.findUnique({
            where: { id: where.id },
            include: {
                question: true,
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        })
        return result ? this.transformQuestionBank(result) : null
    }

    async create(data: {
        levelN?: number | null
        bankType: string
        status: QuestionBankStatusEnum
        questionId: number
        creatorId?: number
    }): Promise<QuestionBankType> {
        const result = await this.prismaService.question_Bank.create({
            data
        })
        return this.transformQuestionBank(result)
    }

    async update(
        where: { id: number },
        data: {
            levelN?: number | null
            bankType?: string
            status?: QuestionBankStatusEnum
        }
    ): Promise<QuestionBankType> {
        const result = await this.prismaService.question_Bank.update({
            where,
            data
        })
        return this.transformQuestionBank(result)
    }

    async delete(where: { id: number }): Promise<QuestionBankType> {
        const result = await this.prismaService.question_Bank.delete({
            where
        })
        return this.transformQuestionBank(result)
    }

    async count(where?: any): Promise<number> {
        return this.prismaService.question_Bank.count({ where })
    }

    private transformQuestionBank(questionBank: any): QuestionBankType {
        return {
            id: questionBank.id,
            levelN: questionBank.levelN || null,
            bankType: questionBank.bankType,
            status: questionBank.status,
            questionId: questionBank.questionId,
            creatorId: questionBank.creatorId || null,
            createdAt: questionBank.createdAt,
            updatedAt: questionBank.updatedAt
        }
    }
}

