import { VocabularyType } from '@/modules/vocabulary/entities/vocabulary.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class VocabularyRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: {
        page: number
        limit: number
        search?: string
        wordJp?: string
        reading?: string
    }) {
        const { page, limit, search, wordJp, reading } = params
        const skip = (page - 1) * limit

        const where: any = {}

        if (search) {
            where.OR = [
                { wordJp: { contains: search, mode: 'insensitive' } },
                { reading: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (wordJp) {
            where.wordJp = { contains: wordJp, mode: 'insensitive' }
        }

        if (reading) {
            where.reading = { contains: reading, mode: 'insensitive' }
        }

        const [items, total] = await Promise.all([
            this.prismaService.vocabulary.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' }
            }),
            this.prismaService.vocabulary.count({ where })
        ])

        return {
            items: items.map(item => this.transformVocabulary(item)),
            total,
            page,
            limit
        }
    }

    async findUnique(where: { id?: number }): Promise<VocabularyType | null> {
        if (!where.id) return null

        const result = await this.prismaService.vocabulary.findUnique({
            where: { id: where.id }
        })
        return result ? this.transformVocabulary(result) : null
    }

    async findFirst(where: { wordJp: string }): Promise<VocabularyType | null> {
        const result = await this.prismaService.vocabulary.findFirst({
            where
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
            imageUrl: vocabulary.imageUrl || undefined,
            audioUrl: vocabulary.audioUrl || undefined,
            createdById: vocabulary.createdById || undefined
        }
    }

}
