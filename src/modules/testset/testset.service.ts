import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { TestSetRepository } from './testset.repo'
import { CreateTestSetBodyType, UpdateTestSetBodyType, GetTestSetListQueryType, GetTestSetByIdParamsType, CreateTestSetWithMeaningsBodyType, UpdateTestSetWithMeaningsBodyType } from './entities/testset.entities'
import { TestSetNotFoundException, TestSetPermissionDeniedException, TestSetAlreadyExistsException } from './dto/testset.error'
import { PrismaService } from '@/shared/services/prisma.service'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TEST_SET_MESSAGE } from '@/common/constants/message'
import { TranslationService } from '../translation/translation.service'
import { LanguagesService } from '../languages/languages.service'

@Injectable()
export class TestSetService {
    private readonly logger = new Logger(TestSetService.name)

    constructor(
        private readonly testSetRepo: TestSetRepository,
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

    private validateTestSetData(data: CreateTestSetBodyType | UpdateTestSetBodyType, isUpdate: boolean = false): void {
        // Validation cho translations
        if (data.translations) {
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

        if (data.audioUrl !== undefined && data.audioUrl && !this.isValidUrl(data.audioUrl)) {
            throw new BadRequestException('URL âm thanh không hợp lệ')
        }

        if (data.price !== undefined && data.price !== null && data.price < 0) {
            throw new BadRequestException('Giá bộ đề không được âm')
        }

        if (data.levelN !== undefined && data.levelN !== null && (data.levelN < 1 || data.levelN > 5)) {
            throw new BadRequestException('Cấp độ JLPT phải từ 1 đến 5')
        }

        // Validation chỉ cho create (không phải update)
        if (!isUpdate) {
            const createData = data as CreateTestSetBodyType
            if (!createData.name || createData.name.trim().length === 0) {
                throw new BadRequestException('Tên bộ đề không được để trống')
            }
            if (!createData.testType) {
                throw new BadRequestException('Loại đề thi không được để trống')
            }
        }
    }

    async createTestSet(data: CreateTestSetBodyType, userId: number): Promise<MessageResDTO> {
        try {
            // Validation
            this.validateTestSetData(data, false)

            // Tạo testset với transaction
            const result = await this.prisma.$transaction(async (tx) => {
                // Tạo testset tạm thời để lấy ID
                const testSet = await tx.testSet.create({
                    data: {
                        name: 'temp', // Tạm thời
                        description: 'temp', // Tạm thời
                        content: data.content,
                        audioUrl: data.audioUrl,
                        price: data.price,
                        levelN: data.levelN,
                        testType: data.testType,
                        status: data.status,
                        creatorId: userId,
                    }
                })

                // Tạo keys
                const nameKey = `testset.${testSet.id}.name`
                const descriptionKey = `testset.${testSet.id}.description`

                // Cập nhật testset với keys
                const updatedTestSet = await tx.testSet.update({
                    where: { id: testSet.id },
                    data: {
                        name: nameKey,
                        description: descriptionKey
                    }
                })

                // Tạo translations
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

                return updatedTestSet
            })

            return {
                statusCode: 201,
                data: result,
                message: TEST_SET_MESSAGE.CREATE_SUCCESS,
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error
            }
            this.logger.error('Error creating testset:', error)
            throw new BadRequestException('Không thể tạo bộ đề')
        }
    }

    async getTestSetById(id: number): Promise<MessageResDTO> {
        const testSet = await this.testSetRepo.findById(id)

        if (!testSet) {
            throw TestSetNotFoundException
        }

        return {
            statusCode: 200,
            data: testSet,
            message: TEST_SET_MESSAGE.GET_SUCCESS,
        }
    }

    async getTestSets(query: GetTestSetListQueryType): Promise<MessageResDTO> {
        const { data, total } = await this.testSetRepo.findMany(query)
        const { currentPage, pageSize } = query
        const totalPage = Math.ceil(total / pageSize)

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
            message: TEST_SET_MESSAGE.GET_LIST_SUCCESS,
        }
    }

    async findAll(query: GetTestSetListQueryType, lang: string) {
        try {
            const { data, total } = await this.testSetRepo.findMany(query)
            const { currentPage, pageSize } = query
            const totalPage = Math.ceil(total / pageSize)

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
                message: TEST_SET_MESSAGE.GET_LIST_SUCCESS,
            }
        } catch (error) {
            this.logger.error('Error finding test sets:', error)
            throw new BadRequestException('Không thể lấy danh sách bộ đề')
        }
    }

    async findOne(id: number, lang: string) {
        try {
            const testSet = await this.testSetRepo.findById(id, lang)

            if (!testSet) {
                throw TestSetNotFoundException
            }

            return {
                statusCode: 200,
                data: testSet,
                message: TEST_SET_MESSAGE.GET_SUCCESS,
            }
        } catch (error) {
            this.logger.error('Error finding test set by id:', error)
            if (error instanceof TestSetNotFoundException) {
                throw error
            }
            throw new BadRequestException('Không thể lấy thông tin bộ đề')
        }
    }

    async updateTestSet(id: number, data: UpdateTestSetBodyType, userId: number): Promise<MessageResDTO> {
        const testSet = await this.testSetRepo.findById(id)

        if (!testSet) {
            throw TestSetNotFoundException
        }

        // Kiểm tra quyền sở hữu
        if (testSet.creatorId !== userId) {
            throw TestSetPermissionDeniedException
        }

        // Validation
        this.validateTestSetData(data, true)

        // Cập nhật testset với transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Cập nhật testset
            const updatedTestSet = await tx.testSet.update({
                where: { id },
                data: {
                    content: data.content,
                    audioUrl: data.audioUrl,
                    price: data.price,
                    levelN: data.levelN,
                    testType: data.testType,
                    status: data.status,
                }
            })

            // Cập nhật translations nếu có
            if (data.translations) {
                const nameKey = `testset.${id}.name`
                const descriptionKey = `testset.${id}.description`

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

            return updatedTestSet
        })

        return {
            statusCode: 200,
            data: result,
            message: TEST_SET_MESSAGE.UPDATE_SUCCESS,
        }
    }

    async deleteTestSet(id: number, userId: number): Promise<MessageResDTO> {
        const testSet = await this.testSetRepo.findById(id)

        if (!testSet) {
            throw TestSetNotFoundException
        }

        // Kiểm tra quyền sở hữu
        if (testSet.creatorId !== userId) {
            throw TestSetPermissionDeniedException
        }

        await this.testSetRepo.delete(id)

        return {
            statusCode: 200,
            data: testSet,
            message: TEST_SET_MESSAGE.DELETE_SUCCESS,
        }
    }

    private validateTestSetWithMeaningsData(data: CreateTestSetWithMeaningsBodyType | UpdateTestSetWithMeaningsBodyType, isUpdate: boolean = false): void {
        // Validation cho meanings
        if (data.meanings) {
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

        if (data.audioUrl !== undefined && data.audioUrl && !this.isValidUrl(data.audioUrl)) {
            throw new BadRequestException('URL âm thanh không hợp lệ')
        }

        if (data.price !== undefined && data.price !== null && data.price < 0) {
            throw new BadRequestException('Giá bộ đề không được âm')
        }

        if (data.levelN !== undefined && data.levelN !== null && (data.levelN < 1 || data.levelN > 5)) {
            throw new BadRequestException('Cấp độ JLPT phải từ 1 đến 5')
        }

        // Validation chỉ cho create (không phải update)
        if (!isUpdate) {
            const createData = data as CreateTestSetWithMeaningsBodyType
            if (!createData.testType) {
                throw new BadRequestException('Loại đề thi không được để trống')
            }
        }
    }

    async createTestSetWithMeanings(data: CreateTestSetWithMeaningsBodyType, userId: number): Promise<MessageResDTO> {
        try {
            // Validation
            this.validateTestSetWithMeaningsData(data, false)

            // Tạo testset với meanings
            const result = await this.testSetRepo.createWithMeanings(data, userId)

            return {
                statusCode: 201,
                data: result,
                message: TEST_SET_MESSAGE.CREATE_SUCCESS,
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error
            }
            this.logger.error('Error creating testset with meanings:', error)
            throw new BadRequestException('Không thể tạo bộ đề với meanings')
        }
    }

    async updateTestSetWithMeanings(id: number, data: UpdateTestSetWithMeaningsBodyType, userId: number): Promise<MessageResDTO> {
        const testSet = await this.testSetRepo.findById(id)

        if (!testSet) {
            throw TestSetNotFoundException
        }

        // Kiểm tra quyền sở hữu
        if (testSet.creatorId !== userId) {
            throw TestSetPermissionDeniedException
        }

        // Validation
        this.validateTestSetWithMeaningsData(data, true)

        // Cập nhật testset với meanings
        const result = await this.testSetRepo.updateWithMeanings(id, data)

        return {
            statusCode: 200,
            data: result,
            message: TEST_SET_MESSAGE.UPDATE_SUCCESS,
        }
    }


}
