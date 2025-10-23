import { VocabularyType } from '@/modules/vocabulary/entities/vocabulary.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { VocabularySortField, VocabularySortOrder } from '@/common/enum/enum'

@Injectable()
export class VocabularyRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: {
        currentPage: number
        pageSize: number
        search?: string
        levelN?: number
        sortBy?: VocabularySortField
        sort?: VocabularySortOrder
    }) {
        const { currentPage, pageSize, search, levelN, sortBy = VocabularySortField.CREATED_AT, sort = VocabularySortOrder.DESC } = params
        const skip = (currentPage - 1) * pageSize

        const where: any = {}

        if (search) {
            where.OR = [
                { wordJp: { contains: search, mode: 'insensitive' } },
                { reading: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (levelN) {
            where.levelN = levelN
        }

        const [items, total] = await Promise.all([
            this.prismaService.vocabulary.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { [sortBy]: sort },
                include: {
                    wordType: true
                }
            }),
            this.prismaService.vocabulary.count({ where })
        ])

        return {
            items: items.map(item => this.transformVocabulary(item)),
            total,
            page: currentPage,
            limit: pageSize
        }
    }

    async findUnique(where: { id?: number }): Promise<VocabularyType | null> {
        if (!where.id) return null

        const result = await this.prismaService.vocabulary.findUnique({
            where: { id: where.id },
            include: {
                wordType: true
            }
        })
        return result ? this.transformVocabulary(result) : null
    }

    async findFirst(where: { wordJp: string }): Promise<VocabularyType | null> {
        const result = await this.prismaService.vocabulary.findFirst({
            where,
            include: {
                wordType: true
            }
        })
        return result ? this.transformVocabulary(result) : null
    }

    async create(data: {
        wordJp: string
        reading: string
        imageUrl?: string
        audioUrl?: string
        createdById?: number | null
    }): Promise<VocabularyType> {
        const result = await this.prismaService.vocabulary.create({
            data
        })
        return this.transformVocabulary(result)
    }

    async update(
        where: { id: number },
        data: {
            wordJp?: string
            reading?: string
            imageUrl?: string
            audioUrl?: string
        }
    ): Promise<VocabularyType> {
        const result = await this.prismaService.vocabulary.update({
            where,
            data
        })
        return this.transformVocabulary(result)
    }

    async delete(where: { id: number }): Promise<VocabularyType> {
        const result = await this.prismaService.vocabulary.delete({
            where
        })
        return this.transformVocabulary(result)
    }

    async count(where?: any): Promise<number> {
        return this.prismaService.vocabulary.count({ where })
    }

    async getStatistics() {
        // Sử dụng 2 queries thay vì 7 queries để giảm số lượng kết nối database
        const [vocabularyStats, totalKanji] = await Promise.all([
            // Query 1: Lấy thống kê vocabulary theo levelN
            this.prismaService.vocabulary.groupBy({
                by: ['levelN'],
                _count: {
                    levelN: true
                }
            }),
            // Query 2: Đếm tổng số kanji
            this.prismaService.kanji.count()
        ])

        // Tính tổng vocabulary
        const totalVocabulary = vocabularyStats.reduce((sum, stat) => sum + stat._count.levelN, 0)

        // Khởi tạo object kết quả với giá trị mặc định
        const result = {
            totalVocabulary,
            totalKanji,
            vocabularyN5: 0,
            vocabularyN4: 0,
            vocabularyN3: 0,
            vocabularyN2: 0,
            vocabularyN1: 0
        }

        // Cập nhật số lượng vocabulary theo từng level
        vocabularyStats.forEach(stat => {
            if (stat.levelN === 5) result.vocabularyN5 = stat._count.levelN
            else if (stat.levelN === 4) result.vocabularyN4 = stat._count.levelN
            else if (stat.levelN === 3) result.vocabularyN3 = stat._count.levelN
            else if (stat.levelN === 2) result.vocabularyN2 = stat._count.levelN
            else if (stat.levelN === 1) result.vocabularyN1 = stat._count.levelN
        })

        return result
    }

    private transformVocabulary(vocabulary: any): VocabularyType {
        return {
            ...vocabulary,
            imageUrl: vocabulary.imageUrl || null,
            audioUrl: vocabulary.audioUrl || null,
            createdById: vocabulary.createdById || null,
            wordType: vocabulary.wordType ? {
                id: vocabulary.wordType.id,
                nameKey: vocabulary.wordType.nameKey,
                name: undefined // Will be resolved by service layer
            } : null
        }
    }

}
