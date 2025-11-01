import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { TestRepository } from './test.repo'
import { CreateTestBodyType, UpdateTestBodyType, GetTestListQueryType, CreateTestWithMeaningsBodyType, UpdateTestWithMeaningsBodyType } from './entities/test.entities'
import { TestNotFoundException, TestPermissionDeniedException } from './dto/test.error'
import { PrismaService } from '@/shared/services/prisma.service'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TEST_MESSAGE } from '@/common/constants/message'
import { TranslationService } from '../translation/translation.service'
import { LanguagesService } from '../languages/languages.service'

@Injectable()
export class TestService {
    private readonly logger = new Logger(TestService.name)

    constructor(
        private readonly testRepo: TestRepository,
        private readonly prisma: PrismaService,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService,
    ) { }

    private isValidUrl(url: string): boolean {
        try {
            new URL(url)
            return true
        } catch {
            return false
        }
    }

    private validateTestData(data: CreateTestBodyType | UpdateTestBodyType, isUpdate: boolean = false): void {
        // Validation cho translations
        if (data.translations && Array.isArray(data.translations)) {
            if (data.translations.length === 0) {
                throw new BadRequestException('Phải có ít nhất 1 translation')
            }

            // Kiểm tra có ít nhất 1 translation cho name
            const hasNameTranslation = data.translations.some(t => t.field === 'name')
            if (!hasNameTranslation) {
                throw new BadRequestException('Phải có ít nhất 1 translation cho name')
            }
        }

        if (data.testType !== undefined) {
            if (!data.testType) {
                throw new BadRequestException('Loại đề thi không được để trống')
            }
        }

        if (data.price !== undefined && data.price !== null && typeof data.price === 'number' && data.price < 0) {
            throw new BadRequestException('Giá bài test không được âm')
        }

        // Validation chỉ cho create (không phải update)
        if (!isUpdate) {
            const createData = data as CreateTestBodyType
            if (createData.name && typeof createData.name === 'string' && createData.name.trim().length === 0) {
                throw new BadRequestException('Tên bài test không được để trống')
            }
            if (!createData.testType) {
                throw new BadRequestException('Loại đề thi không được để trống')
            }
        }
    }

    async createTest(data: CreateTestBodyType, userId: number): Promise<MessageResDTO> {
        try {
            // Validation
            this.validateTestData(data, false)

            // Tạo test với transaction
            const result = await this.prisma.$transaction(async (tx) => {
                // Tạo test tạm thời để lấy ID
                const test = await (tx as any).test.create({
                    data: {
                        name: 'temp', // Tạm thời
                        description: 'temp', // Tạm thời
                        price: data.price,
                        testType: data.testType,
                        status: data.status,
                        creatorId: userId,
                    }
                })

                // Tạo keys
                const nameKey = `test.${test.id}.name`
                const descriptionKey = `test.${test.id}.description`

                // Cập nhật test với keys
                const updatedTest = await (tx as any).test.update({
                    where: { id: test.id },
                    data: {
                        name: nameKey,
                        description: descriptionKey
                    }
                })

                // Tạo translations
                if (data.translations && Array.isArray(data.translations)) {
                    for (const translation of data.translations) {
                        const language = await this.languagesService.findByCode({ code: translation.language_code })
                        if (language?.data) {
                            const key = translation.field === 'name' ? nameKey : descriptionKey
                            await tx.translation.upsert({
                                where: {
                                    languageId_key: {
                                        key: key,
                                        languageId: language.data.id
                                    }
                                },
                                update: { value: translation.value },
                                create: {
                                    key: key,
                                    languageId: language.data.id,
                                    value: translation.value
                                }
                            })
                        }
                    }
                }

                return updatedTest
            })

            return {
                statusCode: 201,
                data: result,
                message: TEST_MESSAGE.CREATE_SUCCESS,
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error
            }
            this.logger.error('Error creating test:', error)
            throw new BadRequestException('Không thể tạo bài test')
        }
    }

    async findAll(query: GetTestListQueryType, lang: string) {
        try {
            const { data, total } = await this.testRepo.findMany(query)
            const { currentPage, pageSize } = query
            const totalPage = Math.ceil(total / (typeof pageSize === 'number' ? pageSize : 10))

            return {
                statusCode: 200,
                data: {
                    results: data,
                    pagination: {
                        current: currentPage,
                        pageSize,
                        totalPage,
                        totalItem: total,
                    },
                },
                message: TEST_MESSAGE.GET_LIST_SUCCESS,
            }
        } catch (error) {
            this.logger.error('Error finding tests:', error)
            throw new BadRequestException('Không thể lấy danh sách bài test')
        }
    }

    async findOne(id: number, lang: string) {
        try {
            const test = await this.testRepo.findById(id, lang)

            if (!test) {
                throw TestNotFoundException
            }

            return {
                statusCode: 200,
                data: test,
                message: TEST_MESSAGE.GET_SUCCESS,
            }
        } catch (error) {
            this.logger.error('Error finding test by id:', error)
            if (error instanceof TestNotFoundException) {
                throw error
            }
            throw new BadRequestException('Không thể lấy thông tin bài test')
        }
    }

    async updateTest(id: number, data: UpdateTestBodyType, userId: number): Promise<MessageResDTO> {
        const test = await this.testRepo.findById(id)

        if (!test) {
            throw TestNotFoundException
        }

        // Kiểm tra quyền sở hữu
        if (test.creatorId !== userId) {
            throw TestPermissionDeniedException
        }

        // Validation
        this.validateTestData(data, true)

        // Cập nhật test với transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Cập nhật test
            const updatedTest = await (tx as any).test.update({
                where: { id },
                data: {
                    price: data.price,
                    testType: data.testType,
                    status: data.status,
                }
            })

            // Cập nhật translations nếu có
            if (data.translations && Array.isArray(data.translations)) {
                const nameKey = `test.${id}.name`
                const descriptionKey = `test.${id}.description`

                // Cập nhật translations
                for (const translation of data.translations) {
                    const language = await this.languagesService.findByCode({ code: translation.language_code })
                    if (language?.data) {
                        const key = translation.field === 'name' ? nameKey : descriptionKey
                        await tx.translation.upsert({
                            where: {
                                languageId_key: {
                                    key: key,
                                    languageId: language.data.id
                                }
                            },
                            update: { value: translation.value },
                            create: {
                                key: key,
                                languageId: language.data.id,
                                value: translation.value
                            }
                        })
                    }
                }
            }

            return updatedTest
        })

        return {
            statusCode: 200,
            data: result,
            message: TEST_MESSAGE.UPDATE_SUCCESS,
        }
    }

    async deleteTest(id: number, userId: number): Promise<MessageResDTO> {
        const test = await this.testRepo.findById(id)

        if (!test) {
            throw TestNotFoundException
        }

        // Kiểm tra quyền sở hữu
        if (test.creatorId !== userId) {
            throw TestPermissionDeniedException
        }

        await this.testRepo.delete(id)

        return {
            statusCode: 200,
            data: test,
            message: TEST_MESSAGE.DELETE_SUCCESS,
        }
    }

    private validateTestWithMeaningsData(data: CreateTestWithMeaningsBodyType | UpdateTestWithMeaningsBodyType, isUpdate: boolean = false): void {
        // Validation cho meanings
        if (data.meanings && Array.isArray(data.meanings)) {
            if (data.meanings.length === 0) {
                throw new BadRequestException('Phải có ít nhất 1 meaning')
            }

            // Kiểm tra có ít nhất 1 meaning cho name
            const hasNameMeaning = data.meanings.some(m => m.field === 'name')
            if (!hasNameMeaning) {
                throw new BadRequestException('Phải có ít nhất 1 meaning cho name')
            }
        }

        if (data.testType !== undefined) {
            if (!data.testType) {
                throw new BadRequestException('Loại đề thi không được để trống')
            }
        }

        if (data.price !== undefined && data.price !== null && typeof data.price === 'number' && data.price < 0) {
            throw new BadRequestException('Giá bài test không được âm')
        }

        // Validation chỉ cho create (không phải update)
        if (!isUpdate) {
            const createData = data as CreateTestWithMeaningsBodyType
            if (!createData.testType) {
                throw new BadRequestException('Loại đề thi không được để trống')
            }
        }
    }

    async createTestWithMeanings(data: CreateTestWithMeaningsBodyType, userId: number): Promise<MessageResDTO> {
        try {
            // Validation
            this.validateTestWithMeaningsData(data, false)

            // Tạo test với meanings
            const result = await this.testRepo.createWithMeanings(data, userId)

            return {
                statusCode: 201,
                data: result,
                message: TEST_MESSAGE.CREATE_SUCCESS,
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error
            }
            this.logger.error('Error creating test with meanings:', error)
            throw new BadRequestException('Không thể tạo bài test với meanings')
        }
    }

    async updateTestWithMeanings(id: number, data: UpdateTestWithMeaningsBodyType, userId: number): Promise<MessageResDTO> {
        const test = await this.testRepo.findById(id)

        if (!test) {
            throw TestNotFoundException
        }

        // Kiểm tra quyền sở hữu
        if (test.creatorId !== userId) {
            throw TestPermissionDeniedException
        }

        // Validation
        this.validateTestWithMeaningsData(data, true)

        // Cập nhật test với meanings
        const result = await this.testRepo.updateWithMeanings(id, data)

        return {
            statusCode: 200,
            data: result,
            message: TEST_MESSAGE.UPDATE_SUCCESS,
        }
    }
}

