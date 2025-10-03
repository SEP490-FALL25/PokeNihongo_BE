import { LanguagesType, CreateLanguagesBodyType, UpdateLanguagesBodyType } from './entities/languages.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class LanguagesRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: {
        page: number
        limit: number
        search?: string
        code?: string
    }) {
        const { page, limit, search, code } = params
        const skip = (page - 1) * limit

        const where: any = {}

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (code) {
            where.code = { contains: code, mode: 'insensitive' }
        }

        const [data, total] = await Promise.all([
            this.prismaService.languages.findMany({
                where,
                skip,
                take: limit,
                orderBy: { code: 'asc' }
            }),
            this.prismaService.languages.count({ where })
        ])

        return {
            data: data.map(item => this.transformLanguages(item)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    }

    async findById(id: number): Promise<LanguagesType | null> {
        const languages = await this.prismaService.languages.findUnique({
            where: { id }
        })

        if (!languages) {
            return null
        }

        return this.transformLanguages(languages)
    }

    async findByCode(code: string): Promise<LanguagesType | null> {
        const languages = await this.prismaService.languages.findUnique({
            where: { code }
        })

        if (!languages) {
            return null
        }

        return this.transformLanguages(languages)
    }

    async create(data: CreateLanguagesBodyType): Promise<LanguagesType> {
        const result = await this.prismaService.languages.create({
            data: {
                code: data.code,
                name: data.name
            }
        })

        return this.transformLanguages(result)
    }

    async update(id: number, data: UpdateLanguagesBodyType): Promise<LanguagesType> {
        const result = await this.prismaService.languages.update({
            where: { id },
            data: {
                code: data.code,
                name: data.name
            }
        })

        return this.transformLanguages(result)
    }

    async updateByCode(code: string, data: UpdateLanguagesBodyType): Promise<LanguagesType> {
        const result = await this.prismaService.languages.update({
            where: { code },
            data: {
                code: data.code,
                name: data.name
            }
        })

        return this.transformLanguages(result)
    }

    async delete(id: number): Promise<void> {
        await this.prismaService.languages.delete({
            where: { id }
        })
    }

    async deleteByCode(code: string): Promise<void> {
        await this.prismaService.languages.delete({
            where: { code }
        })
    }

    async count(where?: any): Promise<number> {
        return this.prismaService.languages.count({ where })
    }

    private transformLanguages(languages: any): LanguagesType {
        return {
            id: languages.id,
            code: languages.code,
            name: languages.name,
            createdAt: languages.createdAt,
            updatedAt: languages.updatedAt
        }
    }
}
