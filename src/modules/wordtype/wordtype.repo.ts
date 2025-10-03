import { WordType, CreateWordTypeServiceType, UpdateWordTypeServiceType } from './entities/wordtype.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class WordTypeRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: {
        page: number
        limit: number
        search?: string
        tag?: string
        sortBy?: string
        sortOrder?: 'asc' | 'desc'
    }) {
        const { page, limit, search, tag, sortBy = 'id', sortOrder = 'asc' } = params
        const skip = (page - 1) * limit

        const where: any = {}

        if (search) {
            where.OR = [
                { nameKey: { contains: search, mode: 'insensitive' } },
                { tag: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (tag) {
            where.tag = { contains: tag, mode: 'insensitive' }
        }

        const [data, total] = await Promise.all([
            this.prismaService.wordType.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder }
            }),
            this.prismaService.wordType.count({ where })
        ])

        return {
            data: data.map(item => this.transformWordType(item)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    }

    async findById(id: number): Promise<WordType | null> {
        const result = await this.prismaService.wordType.findUnique({
            where: { id }
        })

        if (!result) return null

        return this.transformWordType(result)
    }

    async findByTag(tag: string): Promise<WordType | null> {
        const result = await this.prismaService.wordType.findFirst({
            where: { tag }
        })

        if (!result) return null

        return this.transformWordType(result)
    }

    async findByNameKey(nameKey: string): Promise<WordType | null> {
        const result = await this.prismaService.wordType.findUnique({
            where: { nameKey }
        })

        if (!result) return null

        return this.transformWordType(result)
    }

    async create(data: CreateWordTypeServiceType): Promise<WordType> {
        const result = await this.prismaService.wordType.create({
            data: {
                nameKey: data.nameKey,
                tag: data.tag
            }
        })

        return this.transformWordType(result)
    }

    async update(id: number, data: UpdateWordTypeServiceType): Promise<WordType> {
        const result = await this.prismaService.wordType.update({
            where: { id },
            data: {
                ...(data.nameKey && { nameKey: data.nameKey }),
                ...(data.tag && { tag: data.tag })
            }
        })

        return this.transformWordType(result)
    }

    async delete(id: number): Promise<void> {
        await this.prismaService.wordType.delete({
            where: { id }
        })
    }

    async count(where?: any): Promise<number> {
        return this.prismaService.wordType.count({ where })
    }

    async existsByNameKey(nameKey: string, excludeId?: number): Promise<boolean> {
        const count = await this.prismaService.wordType.count({
            where: {
                nameKey,
                ...(excludeId && { id: { not: excludeId } })
            }
        })
        return count > 0
    }

    async getStats() {
        const total = await this.prismaService.wordType.count()

        return {
            total
        }
    }

    private transformWordType(wordType: any): WordType {
        return {
            id: wordType.id,
            nameKey: wordType.nameKey,
            tag: wordType.tag,
            createdAt: wordType.createdAt,
            updatedAt: wordType.updatedAt
        }
    }
}

