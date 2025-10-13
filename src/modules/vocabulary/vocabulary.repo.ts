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
