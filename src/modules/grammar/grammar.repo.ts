import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import {
    CreateGrammarBodyType,
    UpdateGrammarBodyType,
    GetGrammarListQueryType,
} from './entities/grammar.entities'

@Injectable()
export class GrammarRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: GetGrammarListQueryType) {
        const { page, limit, level, search } = params
        const skip = (page - 1) * limit

        const where: any = {}

        if (level) {
            where.level = level
        }

        if (search) {
            where.structure = {
                contains: search,
                mode: 'insensitive'
            }
        }

        const [data, total] = await Promise.all([
            this.prismaService.grammar.findMany({
                where,
                orderBy: [
                    { level: 'asc' },
                    { createdAt: 'desc' }
                ],
                skip,
                take: limit,
            }),
            this.prismaService.grammar.count({ where })
        ])

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }
    }

    async findById(id: number) {
        return this.prismaService.grammar.findUnique({
            where: { id },
            include: {
                usages: {
                    include: {
                        grammar: true
                    }
                }
            }
        })
    }

    async findByIdWithTranslations(id: number) {
        const grammar = await this.prismaService.grammar.findUnique({
            where: { id },
            include: {
                usages: {
                    include: {
                        grammar: true
                    }
                }
            }
        })

        if (!grammar) {
            return null
        }

        // Get translations for all usage keys
        const usageKeys = grammar.usages.flatMap(usage => [
            usage.explanationKey,
            usage.exampleSentenceKey
        ])

        const translations = await this.prismaService.translation.findMany({
            where: {
                key: {
                    in: usageKeys
                }
            },
            include: {
                language: true
            }
        })

        // Group translations by key
        const translationsByKey = translations.reduce((acc, translation) => {
            if (!acc[translation.key]) {
                acc[translation.key] = []
            }
            acc[translation.key].push(translation)
            return acc
        }, {} as Record<string, any[]>)

        // Add translations to usages
        const usagesWithTranslations = grammar.usages.map(usage => ({
            ...usage,
            explanationTranslations: translationsByKey[usage.explanationKey] || [],
            exampleTranslations: translationsByKey[usage.exampleSentenceKey] || []
        }))

        return {
            ...grammar,
            usages: usagesWithTranslations
        }
    }

    async create(data: CreateGrammarBodyType) {
        return this.prismaService.grammar.create({
            data
        })
    }

    async update(id: number, data: UpdateGrammarBodyType) {
        return this.prismaService.grammar.update({
            where: { id },
            data
        })
    }

    async delete(id: number) {
        return this.prismaService.grammar.delete({
            where: { id }
        })
    }

    // Helper methods
    async checkGrammarExists(id: number) {
        const count = await this.prismaService.grammar.count({
            where: { id }
        })
        return count > 0
    }

    async checkStructureExists(structure: string, excludeId?: number) {
        const where: any = { structure }
        if (excludeId) {
            where.id = { not: excludeId }
        }

        const count = await this.prismaService.grammar.count({ where })
        return count > 0
    }
}
