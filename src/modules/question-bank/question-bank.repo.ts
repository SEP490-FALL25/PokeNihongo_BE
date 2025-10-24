import { QuestionBankType, CreateQuestionBankBodyType, CreateQuestionBankWithMeaningsBodyType, UpdateQuestionBankBodyType, GetQuestionBankListQueryType } from '@/modules/question-bank/entities/question-bank.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable, Logger } from '@nestjs/common'
import { QuestionType } from '@prisma/client'

@Injectable()
export class QuestionBankRepository {
    private readonly logger = new Logger(QuestionBankRepository.name)

    constructor(private readonly prisma: PrismaService) { }

    async findMany(query: GetQuestionBankListQueryType): Promise<{ data: QuestionBankType[]; total: number }> {
        const { currentPage, pageSize, levelN, questionType, search } = query
        const skip = (currentPage - 1) * pageSize

        const where: any = {}

        if (search) {
            where.OR = [
                { questionJp: { contains: search, mode: 'insensitive' } },
                { questionKey: { contains: search, mode: 'insensitive' } },
                { pronunciation: { contains: search, mode: 'insensitive' } },
            ]
        }

        if (levelN) {
            where.levelN = levelN
        }

        if (questionType) {
            where.questionType = questionType
        }

        const [data, total] = await Promise.all([
            this.prisma.questionBank.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: {
                            answers: true,
                            userAnswerLogs: true,
                            userSpeakingAttempts: true,
                            testSetQuestionBanks: true,
                        },
                    },
                },
            }),
            this.prisma.questionBank.count({ where }),
        ])

        return { data, total }
    }

    async findById(id: number): Promise<QuestionBankType | null> {
        return await this.prisma.questionBank.findUnique({
            where: { id },
            include: {
                answers: true,
                userAnswerLogs: true,
                userSpeakingAttempts: true,
                testSetQuestionBanks: {
                    include: {
                        testSet: {
                            select: {
                                id: true,
                                name: true,
                                testType: true,
                            },
                        },
                    },
                },
            },
        })
    }

    async create(data: CreateQuestionBankBodyType): Promise<QuestionBankType> {
        return await this.prisma.questionBank.create({
            data,
        })
    }

    async createWithMeanings(data: CreateQuestionBankWithMeaningsBodyType, userId: number): Promise<QuestionBankType> {
        const { meanings, ...questionBankData } = data

        return await this.prisma.$transaction(async (tx) => {
            // Tạo question bank
            const questionBank = await tx.questionBank.create({
                data: questionBankData,
            })

            // Tạo translations nếu có
            if (meanings && meanings.length > 0) {
                for (const meaning of meanings) {
                    // Tạo translations cho từng ngôn ngữ
                    for (const [languageCode, translation] of Object.entries(meaning.translations)) {
                        // Tìm languageId từ languageCode
                        const language = await tx.languages.findFirst({
                            where: { code: languageCode }
                        })

                        if (language) {
                            await tx.translation.upsert({
                                where: {
                                    languageId_key: {
                                        languageId: language.id,
                                        key: meaning.meaningKey!
                                    }
                                },
                                update: {
                                    value: translation
                                },
                                create: {
                                    languageId: language.id,
                                    key: meaning.meaningKey!,
                                    value: translation
                                }
                            })
                        }
                    }
                }
            }

            return questionBank
        })
    }

    async update(id: number, data: UpdateQuestionBankBodyType): Promise<QuestionBankType> {
        return await this.prisma.questionBank.update({
            where: { id },
            data,
        })
    }

    async delete(id: number): Promise<QuestionBankType> {
        return await this.prisma.questionBank.delete({
            where: { id },
        })
    }

    async findByQuestionType(questionType: QuestionType): Promise<QuestionBankType[]> {
        return await this.prisma.questionBank.findMany({
            where: { questionType },
            orderBy: { id: 'asc' },
        })
    }

    async findByLevelN(levelN: number): Promise<QuestionBankType[]> {
        return await this.prisma.questionBank.findMany({
            where: { levelN },
            orderBy: { id: 'asc' },
        })
    }

    async findByTestSetId(testSetId: number): Promise<QuestionBankType[]> {
        return await this.prisma.questionBank.findMany({
            where: {
                testSetQuestionBanks: {
                    some: {
                        testSetId: testSetId
                    }
                }
            },
            orderBy: { id: 'asc' },
        })
    }

    async getStatistics() {
        const [total, byType, byLevel] = await Promise.all([
            this.prisma.questionBank.count(),
            this.prisma.questionBank.groupBy({
                by: ['questionType'],
                _count: { questionType: true },
            }),
            this.prisma.questionBank.groupBy({
                by: ['levelN'],
                _count: { levelN: true },
            }),
        ])

        return {
            total,
            byType: byType.reduce((acc, item) => {
                acc[item.questionType] = item._count.questionType
                return acc
            }, {}),
            byLevel: byLevel.reduce((acc, item) => {
                acc[`N${item.levelN}`] = item._count.levelN
                return acc
            }, {}),
        }
    }

    /**
     * Cập nhật questionKey cho question bank
     */
    async updateQuestionKey(id: number, questionKey: string): Promise<void> {
        await this.prisma.questionBank.update({
            where: { id },
            data: { questionKey }
        })
    }

    /**
     * Kiểm tra questionJp đã tồn tại chưa
     */
    async checkQuestionJpExists(questionJp: string): Promise<boolean> {
        const existing = await this.prisma.questionBank.findFirst({
            where: { questionJp }
        })
        return !!existing
    }

    /**
     * Cập nhật key của translations
     */
    async updateTranslationKeys(oldKey: string, newKey: string): Promise<void> {
        await this.prisma.translation.updateMany({
            where: { key: oldKey },
            data: { key: newKey }
        })
    }
}