import { QuestionBankType, CreateQuestionBankBodyType, CreateQuestionBankWithMeaningsBodyType, UpdateQuestionBankWithMeaningsBodyType, UpdateQuestionBankBodyType, GetQuestionBankListQueryType } from '@/modules/question-bank/entities/question-bank.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable, Logger } from '@nestjs/common'
import { QuestionType } from '@prisma/client'

@Injectable()
export class QuestionBankRepository {
    private readonly logger = new Logger(QuestionBankRepository.name)

    constructor(private readonly prisma: PrismaService) { }

    async findMany(query: GetQuestionBankListQueryType): Promise<{ data: QuestionBankType[]; total: number }> {
        const { currentPage, pageSize, levelN, questionType, search, sortBy = 'createdAt', sort = 'desc', language, testSetId, noTestSet } = query
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

        // Lọc theo testSetId - loại trừ những câu hỏi thuộc testSetId đó
        if (testSetId) {
            where.testSetQuestionBanks = {
                none: {
                    testSetId: testSetId
                }
            }
        }

        // Lọc câu hỏi chưa có trong testSet nào
        if (noTestSet) {
            where.testSetQuestionBanks = {
                none: {}
            }
        }

        const orderBy: any = {}
        orderBy[sortBy] = sort

        const [questionBanks, total] = await Promise.all([
            this.prisma.questionBank.findMany({
                where,
                skip,
                take: pageSize,
                orderBy,
            }),
            this.prisma.questionBank.count({ where }),
        ])

        // Lấy translation cho từng question bank
        const data = await Promise.all(
            questionBanks.map(async (questionBank) => {
                if (questionBank.questionKey) {
                    const translationWhere: any = {
                        key: questionBank.questionKey
                    }

                    // Nếu có language, chỉ lấy translation của ngôn ngữ đó
                    if (language) {
                        const languageRecord = await this.prisma.languages.findFirst({
                            where: { code: language }
                        })
                        if (languageRecord) {
                            translationWhere.languageId = languageRecord.id
                        }
                    }

                    // Tìm translation theo pattern meaning: question.VOCABULARY.99.meaning.*
                    let translations = await this.prisma.translation.findMany({
                        where: {
                            ...translationWhere,
                            key: { startsWith: questionBank.questionKey + '.meaning.' }
                        },
                        include: {
                            language: true
                        }
                    })

                    // Nếu không tìm thấy với key mới, thử tìm với key cũ (backward compatibility)
                    if (translations.length === 0) {
                        // Chuyển từ key mới sang key cũ: question.VOCABULARY.99 -> VOCABULARY.99.question
                        const oldKey = questionBank.questionKey.replace(/^question\.(\w+)\.(\d+)$/, '$1.$2.question')

                        translations = await this.prisma.translation.findMany({
                            where: {
                                ...translationWhere,
                                key: { startsWith: oldKey + '.meaning.' }
                            },
                            include: {
                                language: true
                            }
                        })
                    }

                    // Nếu có language filter, chỉ lấy 1 translation
                    if (language) {
                        (questionBank as any).meaning = translations.length > 0 ? translations[0].value : ''
                    } else {
                        // Nếu không có language filter, lấy tất cả translations
                        (questionBank as any).meanings = translations.length > 0 ? translations.map(t => ({
                            language: t.language.code,
                            value: t.value
                        })) : []
                    }
                } else {
                    // Nếu không có questionKey, vẫn set field rỗng
                    if (language) {
                        (questionBank as any).meaning = ''
                    } else {
                        (questionBank as any).meanings = []
                    }
                }
                return questionBank
            })
        )

        return { data, total }
    }

    async findById(id: number): Promise<QuestionBankType | null> {
        const questionBank = await this.prisma.questionBank.findUnique({
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

        if (!questionBank) {
            return null
        }

        // Lấy translation cho questionKey nếu có
        if (questionBank.questionKey) {
            // Tìm translation theo 2 pattern:
            // 1. Key chính xác: GRAMMAR.5.question
            // 2. Pattern meaning: GRAMMAR.5.question.meaning.*
            let translations = await this.prisma.translation.findMany({
                where: {
                    OR: [
                        { key: questionBank.questionKey }, // Key chính xác
                        { key: { startsWith: questionBank.questionKey + '.meaning.' } } // Pattern meaning
                    ]
                },
                include: {
                    language: true
                }
            })

            // Nếu không tìm thấy và key có format cũ, thử tìm theo format mới
            if (translations.length === 0 && questionBank.questionKey.includes('.question')) {
                const newKey = questionBank.questionKey.replace('.question', '').replace(/^(\w+)\.(\d+)$/, 'question.$1.$2')

                translations = await this.prisma.translation.findMany({
                    where: {
                        OR: [
                            { key: newKey }, // Key chính xác mới
                            { key: { startsWith: newKey + '.meaning.' } } // Pattern meaning mới
                        ]
                    },
                    include: {
                        language: true
                    }
                })
            }

            // Lấy tất cả translations cho findById
            (questionBank as any).meanings = translations.length > 0 ? translations.map(t => ({
                language: t.language.code,
                value: t.value
            })) : []
        } else {
            // Nếu không có questionKey, vẫn set field rỗng
            (questionBank as any).meanings = []
        }

        return questionBank
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

    async updateWithMeanings(id: number, data: UpdateQuestionBankWithMeaningsBodyType): Promise<QuestionBankType> {
        const { meanings, ...questionBankData } = data

        return await this.prisma.$transaction(async (tx) => {
            // Update question bank
            const questionBank = await tx.questionBank.update({
                where: { id },
                data: questionBankData,
            })

            // Update translations nếu có
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
    async checkQuestionJpExists(questionJp: string, excludeId?: number): Promise<boolean> {
        const where: any = { questionJp }
        if (excludeId) {
            where.id = { not: excludeId }
        }

        const existing = await this.prisma.questionBank.findFirst({
            where
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

    /**
     * Xóa nhiều question bank cùng lúc và tự động xóa translations liên quan
     */
    async deleteMany(ids: number[]): Promise<{ deletedCount: number; deletedIds: number[] }> {
        if (!ids || ids.length === 0) {
            return { deletedCount: 0, deletedIds: [] }
        }

        return await this.prisma.$transaction(async (tx) => {
            // Lấy thông tin question banks để lấy questionKey
            const questionBanks = await tx.questionBank.findMany({
                where: { id: { in: ids } },
                select: { id: true, questionKey: true }
            })

            const foundIds = questionBanks.map(qb => qb.id)
            const questionKeys = questionBanks
                .filter(qb => qb.questionKey)
                .map(qb => qb.questionKey!)

            // Xóa translations liên quan (nếu có questionKey)
            if (questionKeys.length > 0) {
                // Tạo array các pattern để xóa
                const keyPatterns = questionKeys.flatMap(key => [
                    { key: { equals: key } }, // Key chính xác
                    { key: { startsWith: key + '.meaning.' } } // Pattern meaning
                ])

                await tx.translation.deleteMany({
                    where: {
                        OR: keyPatterns
                    }
                })
            }

            // Xóa question banks
            const deleteResult = await tx.questionBank.deleteMany({
                where: { id: { in: foundIds } }
            })

            return {
                deletedCount: deleteResult.count,
                deletedIds: foundIds
            }
        })
    }
}