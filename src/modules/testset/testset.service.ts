import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { TestSetRepository } from './testset.repo'
import { CreateTestSetBodyType, UpdateTestSetBodyType, GetTestSetListQueryType, GetTestSetByIdParamsType } from './entities/testset.entities'
import { TestSetNotFoundException, TestSetPermissionDeniedException, TestSetAlreadyExistsException } from './dto/testset.error'
import { PrismaService } from '@/shared/services/prisma.service'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TEST_SET_MESSAGE } from '@/common/constants/message'

@Injectable()
export class TestSetService {
    private readonly logger = new Logger(TestSetService.name)

    constructor(
        private readonly testSetRepo: TestSetRepository,
        private readonly prisma: PrismaService,
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
        if (data.name !== undefined) {
            if (!data.name || data.name.trim().length === 0) {
                throw new BadRequestException('Tên bộ đề không được để trống')
            }
            if (data.name.length > 200) {
                throw new BadRequestException('Tên bộ đề quá dài (tối đa 200 ký tự)')
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

            const testSet = await this.testSetRepo.create({
                ...data,
                creatorId: userId,
            })

            return {
                statusCode: 201,
                data: testSet,
                message: TEST_SET_MESSAGE.CREATE_SUCCESS,
            }
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error
            }
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
            const testSet = await this.testSetRepo.findById(id)

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

        const updatedTestSet = await this.testSetRepo.update(id, data)

        return {
            statusCode: 200,
            data: updatedTestSet,
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


}
