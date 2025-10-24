import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { TestSetType, CreateTestSetBodyType, UpdateTestSetBodyType, GetTestSetListQueryType } from './entities/testset.entities'
import { QuestionType } from '@prisma/client'

@Injectable()
export class TestSetRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: CreateTestSetBodyType & { creatorId?: number }): Promise<TestSetType> {
        const result = await this.prisma.testSet.create({
            data: {
                name: data.name,
                description: data.description,
                content: data.content,
                audioUrl: data.audioUrl,
                price: data.price,
                levelN: data.levelN,
                testType: data.testType,
                status: data.status,
                creatorId: data.creatorId,
            },
        })
        return {
            ...result,
            price: result.price ? Number(result.price) : null,
            testType: result.testType as QuestionType,
        }
    }

    async findById(id: number): Promise<TestSetType | null> {
        const result = await this.prisma.testSet.findUnique({
            where: { id },
        })
        if (!result) return null
        return {
            ...result,
            price: result.price ? Number(result.price) : null,
            testType: result.testType as QuestionType,
        }
    }


    async findMany(query: GetTestSetListQueryType): Promise<{ data: TestSetType[]; total: number }> {
        const { currentPage, pageSize, search, levelN, testType, status, creatorId } = query
        const skip = (currentPage - 1) * pageSize

        const where: any = {}

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
            ]
        }

        if (levelN) {
            where.levelN = levelN
        }

        if (testType) {
            where.testType = testType
        }

        if (status) {
            where.status = status
        }

        if (creatorId) {
            where.creatorId = creatorId
        }

        const [rawData, total] = await Promise.all([
            this.prisma.testSet.findMany({
                where,
                skip,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    _count: {
                        select: {
                            testSetQuestionBanks: true,
                            exercises: true,
                        },
                    },
                },
            }),
            this.prisma.testSet.count({ where }),
        ])

        const data = rawData.map(item => ({
            ...item,
            price: item.price ? Number(item.price) : null,
            testType: item.testType as QuestionType,
            // Remove _count and creator from the response
            _count: undefined,
            creator: undefined,
        }))

        return { data, total }
    }

    async update(id: number, data: UpdateTestSetBodyType): Promise<TestSetType> {
        const result = await this.prisma.testSet.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.content !== undefined && { content: data.content }),
                ...(data.audioUrl !== undefined && { audioUrl: data.audioUrl }),
                ...(data.price !== undefined && { price: data.price }),
                ...(data.levelN !== undefined && { levelN: data.levelN }),
                ...(data.testType && { testType: data.testType }),
                ...(data.status && { status: data.status }),
            },
        })
        return {
            ...result,
            price: result.price ? Number(result.price) : null,
            testType: result.testType as QuestionType,
        }
    }

    async delete(id: number): Promise<TestSetType> {
        const result = await this.prisma.testSet.delete({
            where: { id },
        })
        return {
            ...result,
            price: result.price ? Number(result.price) : null,
            testType: result.testType as QuestionType,
        }
    }

}
