import {
    Kanji,
    CreateKanjiBodyType,
    UpdateKanjiBodyType
} from './entities/kanji.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class KanjiRepository {
    constructor(private readonly prismaService: PrismaService) { }

    // Kanji CRUD operations
    async findMany(params: {
        page: number
        limit: number
        search?: string
        jlptLevel?: number
        strokeCount?: number
        sortBy?: string
        sortOrder?: 'asc' | 'desc'
    }) {
        const { page, limit, search, jlptLevel, strokeCount, sortBy = 'id', sortOrder = 'asc' } = params
        const skip = (page - 1) * limit

        const where: any = {}

        if (search) {
            where.OR = [
                { character: { contains: search, mode: 'insensitive' } },
                { meaningKey: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (jlptLevel) {
            where.jlptLevel = jlptLevel
        }

        if (strokeCount) {
            where.strokeCount = strokeCount
        }

        const orderBy: any = {}
        orderBy[sortBy] = sortOrder

        const [data, total] = await Promise.all([
            this.prismaService.kanji.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    _count: {
                        select: {
                            vocabularies: true,
                            readings: true
                        }
                    }
                }
            }),
            this.prismaService.kanji.count({ where })
        ])

        return {
            data: data.map(item => this.transformKanji(item)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    }

    async findById(id: number): Promise<Kanji | null> {
        const kanji = await this.prismaService.kanji.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        vocabularies: true
                    }
                }
            }
        })

        if (!kanji) {
            return null
        }

        return this.transformKanji(kanji)
    }

    async findByCharacter(character: string): Promise<Kanji | null> {
        const kanji = await this.prismaService.kanji.findUnique({
            where: { character },
            include: {
                _count: {
                    select: {
                        vocabularies: true
                    }
                }
            }
        })

        if (!kanji) {
            return null
        }

        return this.transformKanji(kanji)
    }

    async create(data: CreateKanjiBodyType): Promise<Kanji> {
        const result = await this.prismaService.kanji.create({
            data: {
                character: data.character,
                meaningKey: data.meaningKey,
                strokeCount: data.strokeCount,
                jlptLevel: data.jlptLevel
            },
            include: {
                _count: {
                    select: {
                        vocabularies: true
                    }
                }
            }
        })

        return this.transformKanji(result)
    }

    async update(id: number, data: UpdateKanjiBodyType): Promise<Kanji> {
        const result = await this.prismaService.kanji.update({
            where: { id },
            data: {
                character: data.character,
                meaningKey: data.meaningKey,
                strokeCount: data.strokeCount,
                jlptLevel: data.jlptLevel
            },
            include: {
                _count: {
                    select: {
                        vocabularies: true
                    }
                }
            }
        })

        return this.transformKanji(result)
    }

    async delete(id: number): Promise<void> {
        await this.prismaService.kanji.delete({
            where: { id }
        })
    }

    async exists(id: number): Promise<boolean> {
        const count = await this.prismaService.kanji.count({
            where: { id }
        })
        return count > 0
    }

    async existsByCharacter(character: string, excludeId?: number): Promise<boolean> {
        const where: any = { character }
        if (excludeId) {
            where.id = { not: excludeId }
        }

        const count = await this.prismaService.kanji.count({ where })
        return count > 0
    }


    // Statistics
    async getStats() {
        const [totalKanji, byJlptLevel] = await Promise.all([
            this.prismaService.kanji.count(),
            this.prismaService.kanji.groupBy({
                by: ['jlptLevel'],
                _count: {
                    jlptLevel: true
                },
                where: {
                    jlptLevel: { not: null }
                }
            })
        ])

        return {
            totalKanji,
            byJlptLevel: byJlptLevel.map(item => ({
                jlptLevel: item.jlptLevel,
                count: item._count.jlptLevel
            }))
        }
    }

    // Transform methods
    private transformKanji(kanji: any): Kanji {
        return {
            id: kanji.id,
            character: kanji.character,
            meaningKey: kanji.meaningKey,
            strokeCount: kanji.strokeCount,
            jlptLevel: kanji.jlptLevel,
            createdAt: kanji.createdAt,
            updatedAt: kanji.updatedAt
        }
    }

}