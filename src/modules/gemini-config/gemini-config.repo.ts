import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { GeminiConfigType as PrismaGeminiConfigType } from '@prisma/client'
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
    GEMINI_CONFIG_FIELDS,
    GeminiConfigType,
    CreateGeminiConfigBodyType,
    UpdateGeminiConfigBodyType
} from './entities/gemini-config.entity'

@Injectable()
export class GeminiConfigRepo {
    constructor(private prismaService: PrismaService) { }

    create({
        createdById,
        data
    }: {
        createdById: number | null
        data: CreateGeminiConfigBodyType
    }): Promise<GeminiConfigType> {
        return this.prismaService.geminiConfig.create({
            data: {
                ...data,
                createdById
            }
        })
    }

    update({
        id,
        updatedById,
        data
    }: {
        id: number
        updatedById: number
        data: UpdateGeminiConfigBodyType
    }): Promise<GeminiConfigType> {
        return this.prismaService.geminiConfig.update({
            where: {
                id,
                deletedAt: null
            },
            data: {
                ...data,
                updatedById
            }
        })
    }

    delete(
        {
            id,
            deletedById
        }: {
            id: number
            deletedById: number
        },
        isHard?: boolean
    ): Promise<GeminiConfigType> {
        return isHard
            ? this.prismaService.geminiConfig.delete({
                where: {
                    id
                }
            })
            : this.prismaService.geminiConfig.update({
                where: {
                    id,
                    deletedAt: null
                },
                data: {
                    deletedAt: new Date(),
                    deletedById
                }
            })
    }

    async list(pagination: PaginationQueryType) {
        const { where, orderBy } = parseQs(pagination.qs, GEMINI_CONFIG_FIELDS)

        const skip = (pagination.currentPage - 1) * pagination.pageSize
        const take = pagination.pageSize

        const [totalItems, data] = await Promise.all([
            this.prismaService.geminiConfig.count({
                where: { deletedAt: null, ...where }
            }),
            this.prismaService.geminiConfig.findMany({
                where: { deletedAt: null, ...where },
                orderBy,
                skip,
                take
            })
        ])

        return {
            results: data,
            pagination: {
                current: pagination.currentPage,
                pageSize: pagination.pageSize,
                totalPage: Math.ceil(totalItems / pagination.pageSize),
                totalItem: totalItems
            }
        }
    }

    findById(id: number): Promise<GeminiConfigType | null> {
        return this.prismaService.geminiConfig.findUnique({
            where: {
                id,
                deletedAt: null
            }
        })
    }

    findByConfigType(configType: PrismaGeminiConfigType, isActive: boolean = true): Promise<GeminiConfigType | null> {
        return this.prismaService.geminiConfig.findFirst({
            where: {
                configType,
                isActive,
                deletedAt: null
            }
        })
    }
}

