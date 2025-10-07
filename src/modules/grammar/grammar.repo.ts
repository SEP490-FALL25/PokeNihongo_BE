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
            where: { id }
        })
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
