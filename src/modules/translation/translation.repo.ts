import { TranslationType, CreateTranslationBodyType, UpdateTranslationBodyType } from './entities/translation.entities'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable } from '@nestjs/common'
import { TranslationSortField, SortOrder } from '@/common/enum/enum'

@Injectable()
export class TranslationRepository {
    constructor(private readonly prismaService: PrismaService) { }

    async findMany(params: {
        page: number
        limit: number
        search?: string
        languageId?: number
        key?: string
        sortBy?: TranslationSortField
        sort?: SortOrder
    }) {
        const { page, limit, search, languageId, key, sortBy = TranslationSortField.CREATED_AT, sort = SortOrder.DESC } = params
        const skip = (page - 1) * limit

        const where: any = {}

        if (search) {
            where.OR = [
                { key: { contains: search, mode: 'insensitive' } },
                { value: { contains: search, mode: 'insensitive' } }
            ]
        }

        if (languageId) {
            where.languageId = languageId
        }

        if (key) {
            where.key = { contains: key, mode: 'insensitive' }
        }

        const [data, total] = await Promise.all([
            this.prismaService.translation.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sort }
            }),
            this.prismaService.translation.count({ where })
        ])

        return {
            data: data.map(item => this.transformTranslation(item)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    }

    async findById(id: number): Promise<TranslationType | null> {
        const translation = await this.prismaService.translation.findUnique({
            where: { id }
        })

        if (!translation) {
            return null
        }

        return this.transformTranslation(translation)
    }

    async findByKeyAndLanguage(key: string, languageId: number): Promise<TranslationType | null> {
        const translation = await this.prismaService.translation.findUnique({
            where: {
                languageId_key: {
                    languageId,
                    key
                }
            }
        })

        if (!translation) {
            return null
        }

        return this.transformTranslation(translation)
    }

    async findByKey(key: string) {
        const translations = await this.prismaService.translation.findMany({
            where: { key },
            orderBy: { languageId: 'asc' }
        })

        return translations.map(item => this.transformTranslation(item))
    }

    async findByLanguage(languageId: number, params: {
        page: number
        limit: number
    }) {
        const { page, limit } = params
        const skip = (page - 1) * limit

        const [data, total] = await Promise.all([
            this.prismaService.translation.findMany({
                where: { languageId },
                skip,
                take: limit,
                orderBy: { key: 'asc' }
            }),
            this.prismaService.translation.count({
                where: { languageId }
            })
        ])

        return {
            data: data.map(item => this.transformTranslation(item)),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    }

    async create(data: CreateTranslationBodyType): Promise<TranslationType> {
        const result = await this.prismaService.translation.create({
            data: {
                languageId: data.languageId,
                key: data.key,
                value: data.value
            }
        })

        return this.transformTranslation(result)
    }

    async createMany(data: CreateTranslationBodyType[]): Promise<{ count: number }> {
        return await this.prismaService.translation.createMany({
            data: data.map(item => ({
                languageId: item.languageId,
                key: item.key,
                value: item.value
            }))
        })
    }

    async update(id: number, data: UpdateTranslationBodyType): Promise<TranslationType> {
        const result = await this.prismaService.translation.update({
            where: { id },
            data: {
                ...(data.languageId && { languageId: data.languageId }),
                ...(data.key && { key: data.key }),
                ...(data.value && { value: data.value })
            }
        })

        return this.transformTranslation(result)
    }

    async updateByKeyAndLanguage(
        key: string,
        languageId: number,
        data: UpdateTranslationBodyType
    ): Promise<TranslationType> {
        const result = await this.prismaService.translation.update({
            where: {
                languageId_key: {
                    languageId,
                    key
                }
            },
            data: {
                ...(data.languageId && { languageId: data.languageId }),
                ...(data.key && { key: data.key }),
                ...(data.value && { value: data.value })
            }
        })

        return this.transformTranslation(result)
    }

    async delete(id: number): Promise<void> {
        await this.prismaService.translation.delete({
            where: { id }
        })
    }

    async deleteByKeyAndLanguage(key: string, languageId: number): Promise<void> {
        await this.prismaService.translation.delete({
            where: {
                languageId_key: {
                    languageId,
                    key
                }
            }
        })
    }

    async deleteByKey(key: string): Promise<{ count: number }> {
        return await this.prismaService.translation.deleteMany({
            where: { key }
        })
    }

    async count(where?: any): Promise<number> {
        return this.prismaService.translation.count({ where })
    }

    private transformTranslation(translation: any): TranslationType {
        return {
            ...translation
        }
    }
}
