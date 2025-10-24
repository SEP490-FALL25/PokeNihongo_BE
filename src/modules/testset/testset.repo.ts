import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/shared/services/prisma.service'
import { TestSetType, CreateTestSetBodyType, UpdateTestSetBodyType, GetTestSetListQueryType, TestSetWithQuestionsType } from './entities/testset.entities'

@Injectable()
export class TestSetRepository {
    constructor(private readonly prisma: PrismaService) { }

    async create(data: CreateTestSetBodyType & { creatorId?: number }): Promise<TestSetType> {
        const result = await this.prisma.testSet.create({
            data: {
                ...data,
                creatorId: data.creatorId,
            },
        })
        return {
            ...result,
            price: result.price ? Number(result.price) : null,
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
        }
    }

    async findByIdWithQuestions(id: number): Promise<TestSetWithQuestionsType | null> {
        const result = await this.prisma.testSet.findUnique({
            where: { id },
            include: {
                testSetQuestionBanks: {
                    include: {
                        questionBank: true,
                    },
                    orderBy: { questionOrder: 'asc' },
                },
                creator: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })
        if (!result) return null
        return {
            ...result,
            price: result.price ? Number(result.price) : null,
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
        }))

        return { data, total }
    }

    async update(id: number, data: UpdateTestSetBodyType): Promise<TestSetType> {
        const result = await this.prisma.testSet.update({
            where: { id },
            data,
        })
        return {
            ...result,
            price: result.price ? Number(result.price) : null,
        }
    }

    async delete(id: number): Promise<TestSetType> {
        const result = await this.prisma.testSet.delete({
            where: { id },
        })
        return {
            ...result,
            price: result.price ? Number(result.price) : null,
        }
    }

}
