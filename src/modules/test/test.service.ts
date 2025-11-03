import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { TestRepository } from './test.repo'
import { CreateTestBodyType, UpdateTestBodyType, GetTestListQueryType, CreateTestWithMeaningsBodyType, UpdateTestWithMeaningsBodyType, DeleteManyTestsBodyType, AddTestSetsToTestBodyType, RemoveTestSetsFromTestBodyType } from './entities/test.entities'
import { TestNotFoundException, TestPermissionDeniedException } from './dto/test.error'
import { PrismaService } from '@/shared/services/prisma.service'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { TEST_MESSAGE } from '@/common/constants/message'
import { TranslationService } from '../translation/translation.service'
import { LanguagesService } from '../languages/languages.service'
import { TestSetRepository } from '../testset/testset.repo'
import { TestSetNotFoundException } from '../testset/dto/testset.error'
import { TestSetQuestionBankService } from '../testset-questionbank/testset-questionbank.service'
import { UserTestAttemptRepository } from '../user-test-attempt/user-test-attempt.repo'
import { UserTestRepository } from '../user-test/user-test.repo'

@Injectable()
export class TestService {
    private readonly logger = new Logger(TestService.name)

    constructor(
        private readonly testRepo: TestRepository,
        private readonly prisma: PrismaService,
        private readonly translationService: TranslationService,
        private readonly languagesService: LanguagesService,
        private readonly testSetRepo: TestSetRepository,
        private readonly testSetQuestionBankService: TestSetQuestionBankService,
        private readonly userTestAttemptRepo: UserTestAttemptRepository,
        private readonly userTestRepo: UserTestRepository,
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

        if (data.levelN !== undefined && data.levelN !== null && (data.levelN < 0 || data.levelN > 5)) {
            throw new BadRequestException('Cấp độ JLPT phải từ 0 đến 5')
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

            // Kiểm tra nếu testType là PLACEMENT_TEST_DONE, chỉ cho phép tạo 1 test duy nhất trong toàn hệ thống
            if (data.testType === 'PLACEMENT_TEST_DONE') {
                const existingPlacementTest = await this.prisma.test.findFirst({
                    where: {
                        testType: 'PLACEMENT_TEST_DONE'
                    }
                })

                if (existingPlacementTest) {
                    throw new BadRequestException('Chỉ được tạo 1 test PLACEMENT_TEST_DONE duy nhất trong toàn hệ thống')
                }
            }

            // Tạo test với transaction
            const result = await this.prisma.$transaction(async (tx) => {
                // Tạo test tạm thời để lấy ID
                const test = await (tx as any).test.create({
                    data: {
                        name: 'temp', // Tạm thời
                        description: 'temp', // Tạm thời
                        price: data.price,
                        levelN: data.levelN,
                        limit: data.limit,
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

    async findAll(query: GetTestListQueryType, lang?: string) {
        try {
            // Nếu lang là undefined (admin), repo sẽ lấy tất cả translations
            // Nếu lang có giá trị (user), repo sẽ filter theo language đó
            const { data, total } = await this.testRepo.findMany({ ...query, language: lang })
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

        // Kiểm tra nếu đang update testType sang READING_TEST/LISTENING_TEST/SPEAKING_TEST
        // và test hiện tại có TestSet type khác thì không cho phép
        if (data.testType && data.testType !== test.testType) {
            const restrictedTestTypes = ['READING_TEST', 'LISTENING_TEST', 'SPEAKING_TEST']
            if (restrictedTestTypes.includes(data.testType)) {
                // Lấy tất cả TestSet hiện có trong test này
                const testTestSets = await (this.prisma as any).testTestSet.findMany({
                    where: { testId: id },
                    include: { testSet: true }
                })

                if (testTestSets.length > 0) {
                    const allowedTestSetType = data.testType.replace('_TEST', '') // READING_TEST -> READING
                    const invalidTestSets = testTestSets.filter((tts: any) => tts.testSet.testType !== allowedTestSetType)

                    if (invalidTestSets.length > 0) {
                        const invalidIds = invalidTestSets.map((tts: any) => tts.testSet.id)
                        throw new BadRequestException(
                            `Không thể đổi testType sang ${data.testType} vì test đang chứa TestSet loại khác. ` +
                            `Vui lòng xóa các TestSet không hợp lệ trước: ${invalidIds.join(', ')}`
                        )
                    }
                }
            }
        }

        // Cập nhật test với transaction
        const result = await this.prisma.$transaction(async (tx) => {
            // Cập nhật test
            const updatedTest = await (tx as any).test.update({
                where: { id },
                data: {
                    ...(data.price !== undefined && { price: data.price }),
                    ...(data.levelN !== undefined && { levelN: data.levelN }),
                    ...(data.limit !== undefined && { limit: data.limit }),
                    ...(data.testType && { testType: data.testType }),
                    ...(data.status && { status: data.status }),
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

    async deleteManyTests(data: DeleteManyTestsBodyType, userId: number): Promise<MessageResDTO> {
        try {
            const { ids } = data

            // Validate input
            if (!ids || ids.length === 0) {
                throw new BadRequestException('Danh sách ID không được để trống')
            }

            // Kiểm tra giới hạn số lượng xóa cùng lúc
            if (ids.length > 100) {
                throw new BadRequestException('Chỉ được xóa tối đa 100 bài test cùng lúc')
            }

            // Lấy danh sách tests để kiểm tra quyền sở hữu
            const tests = await this.prisma.test.findMany({
                where: { id: { in: ids } },
                select: { id: true, creatorId: true }
            })

            // Kiểm tra xem có test nào không tồn tại không
            const foundIds = tests.map(test => test.id)
            const notFoundIds = ids.filter(id => !foundIds.includes(id))

            if (notFoundIds.length > 0) {
                throw new BadRequestException(`Không tìm thấy bài test với ID: ${notFoundIds.join(', ')}`)
            }

            // Kiểm tra quyền sở hữu - tất cả tests phải thuộc về user
            const unauthorizedTests = tests.filter(test => test.creatorId !== userId)
            if (unauthorizedTests.length > 0) {
                throw TestPermissionDeniedException
            }

            // Xóa nhiều tests
            const result = await this.testRepo.deleteMany(ids)

            if (result.deletedCount === 0) {
                throw new BadRequestException('Không có bài test nào được xóa')
            }

            return {
                statusCode: 200,
                data: {
                    deletedCount: result.deletedCount,
                    deletedIds: result.deletedIds,
                    requestedCount: ids.length,
                    notFoundCount: ids.length - result.deletedCount
                },
                message: `Xóa thành công ${result.deletedCount}/${ids.length} bài test`
            }
        } catch (error) {
            this.logger.error('Error deleting many tests:', error)
            if (error instanceof BadRequestException || error instanceof TestPermissionDeniedException) {
                throw error
            }
            throw new BadRequestException('Không thể xóa nhiều bài test')
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

        if (data.levelN !== undefined && data.levelN !== null && (data.levelN < 0 || data.levelN > 5)) {
            throw new BadRequestException('Cấp độ JLPT phải từ 0 đến 5')
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

            // Kiểm tra nếu testType là PLACEMENT_TEST_DONE, chỉ cho phép tạo 1 test duy nhất trong toàn hệ thống
            if (data.testType === 'PLACEMENT_TEST_DONE') {
                const existingPlacementTest = await this.prisma.test.findFirst({
                    where: {
                        testType: 'PLACEMENT_TEST_DONE'
                    }
                })

                if (existingPlacementTest) {
                    throw new BadRequestException('Chỉ được tạo 1 test PLACEMENT_TEST_DONE duy nhất trong toàn hệ thống')
                }
            }

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

        // Kiểm tra nếu đang update testType sang READING_TEST/LISTENING_TEST/SPEAKING_TEST
        // và test hiện tại có TestSet type khác thì không cho phép
        if (data.testType && data.testType !== test.testType) {
            const restrictedTestTypes = ['READING_TEST', 'LISTENING_TEST', 'SPEAKING_TEST']
            if (restrictedTestTypes.includes(data.testType)) {
                // Lấy tất cả TestSet hiện có trong test này
                const testTestSets = await (this.prisma as any).testTestSet.findMany({
                    where: { testId: id },
                    include: { testSet: true }
                })

                if (testTestSets.length > 0) {
                    const allowedTestSetType = data.testType.replace('_TEST', '') // READING_TEST -> READING
                    const invalidTestSets = testTestSets.filter((tts: any) => tts.testSet.testType !== allowedTestSetType)

                    if (invalidTestSets.length > 0) {
                        const invalidIds = invalidTestSets.map((tts: any) => tts.testSet.id)
                        throw new BadRequestException(
                            `Không thể đổi testType sang ${data.testType} vì test đang chứa TestSet loại khác. ` +
                            `Vui lòng xóa các TestSet không hợp lệ trước: ${invalidIds.join(', ')}`
                        )
                    }
                }
            }
        }

        // Cập nhật test với meanings
        const result = await this.testRepo.updateWithMeanings(id, data)

        return {
            statusCode: 200,
            data: result,
            message: TEST_MESSAGE.UPDATE_SUCCESS,
        }
    }

    async addTestSetsToTest(testId: number, data: AddTestSetsToTestBodyType): Promise<MessageResDTO> {
        try {
            // Validate test tồn tại
            const test = await this.testRepo.findById(testId)
            if (!test) {
                throw TestNotFoundException
            }

            // Validate các TestSet tồn tại
            const testSets = await this.prisma.testSet.findMany({
                where: {
                    id: { in: data.testSetIds }
                }
            })

            if (testSets.length !== data.testSetIds.length) {
                const foundIds = testSets.map(ts => ts.id)
                const notFoundIds = data.testSetIds.filter(id => !foundIds.includes(id))
                throw new BadRequestException(`Không tìm thấy TestSet với ID: ${notFoundIds.join(', ')}`)
            }

            // Kiểm tra nếu test là READING_TEST, LISTENING_TEST, hoặc SPEAKING_TEST
            // thì chỉ cho phép thêm TestSet có cùng type (READING, LISTENING, SPEAKING)
            const restrictedTestTypes = ['READING_TEST', 'LISTENING_TEST', 'SPEAKING_TEST']
            if (restrictedTestTypes.includes(test.testType)) {
                const allowedTestSetType = test.testType.replace('_TEST', '') // READING_TEST -> READING
                const invalidTestSets = testSets.filter(ts => ts.testType !== allowedTestSetType)

                if (invalidTestSets.length > 0) {
                    const invalidIds = invalidTestSets.map(ts => ts.id)
                    throw new BadRequestException(
                        `Test loại ${test.testType} chỉ được thêm TestSet loại ${allowedTestSetType}. ` +
                        `TestSet không hợp lệ: ${invalidIds.join(', ')}`
                    )
                }
            }

            // Tạo các bản ghi trong bảng TestTestSet (nhiều-nhiều)
            await (this.prisma as any).testTestSet.createMany({
                data: data.testSetIds.map(testSetId => ({
                    testId: testId,
                    testSetId: testSetId
                })),
                skipDuplicates: true // Bỏ qua nếu đã tồn tại
            })

            return {
                statusCode: 200,
                data: {
                    testId,
                    addedTestSetIds: data.testSetIds,
                    count: data.testSetIds.length
                },
                message: TEST_MESSAGE.ADD_TESTSETS_SUCCESS,
            }
        } catch (error) {
            this.logger.error('Error adding testSets to test:', error)
            if (error instanceof TestNotFoundException || error instanceof BadRequestException) {
                throw error
            }
            throw new BadRequestException('Không thể thêm TestSet vào Test')
        }
    }

    async removeTestSetsFromTest(testId: number, data: RemoveTestSetsFromTestBodyType): Promise<MessageResDTO> {
        try {
            // Validate test tồn tại
            const test = await this.testRepo.findById(testId)
            if (!test) {
                throw TestNotFoundException
            }

            // Validate các TestSet có trong Test này
            const testTestSets = await (this.prisma as any).testTestSet.findMany({
                where: {
                    testId: testId,
                    testSetId: { in: data.testSetIds }
                }
            })

            if (testTestSets.length === 0) {
                throw new BadRequestException('Không có TestSet nào trong Test này để xóa')
            }

            // Xóa các bản ghi trong bảng TestTestSet
            const deletedCount = await (this.prisma as any).testTestSet.deleteMany({
                where: {
                    testId: testId,
                    testSetId: { in: data.testSetIds }
                }
            })

            return {
                statusCode: 200,
                data: {
                    testId,
                    removedTestSetIds: data.testSetIds,
                    count: deletedCount.count
                },
                message: TEST_MESSAGE.REMOVE_TESTSETS_SUCCESS,
            }
        } catch (error) {
            this.logger.error('Error removing testSets from test:', error)
            if (error instanceof TestNotFoundException || error instanceof BadRequestException) {
                throw error
            }
            throw new BadRequestException('Không thể xóa TestSet khỏi Test')
        }
    }

    async findFullById(testId: number, language: string = 'vi'): Promise<MessageResDTO> {
        try {
            this.logger.log(`Finding full test by ID: ${testId}, language: ${language}`)

            // Lấy thông tin Test cơ bản
            const test = await this.testRepo.findById(testId, language)
            if (!test) {
                throw TestNotFoundException
            }

            // Lấy các TestSets của Test qua TestTestSet
            const testTestSets = await (this.prisma as any).testTestSet.findMany({
                where: { testId },
                include: {
                    testSet: {
                        include: {
                            creator: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'asc' }
            })

            // Lấy translations và questions + answers cho từng TestSet
            const testSetsWithDetails = await Promise.all(
                testTestSets.map(async (testTestSet: any) => {
                    const testSet = testTestSet.testSet

                    // Lấy translations cho TestSet
                    const testSetNameKey = `testset.${testSet.id}.name`
                    const testSetDescriptionKey = `testset.${testSet.id}.description`
                    const testSetContentKey = `testset.${testSet.id}.content`

                    const testSetTranslationWhere: any = {
                        OR: [
                            { key: testSetNameKey },
                            { key: testSetDescriptionKey },
                            { key: testSetContentKey },
                            { key: { startsWith: testSetNameKey + '.meaning.' } },
                            { key: { startsWith: testSetDescriptionKey + '.meaning.' } },
                            { key: { startsWith: testSetContentKey + '.meaning.' } }
                        ]
                    }

                    if (language) {
                        const languageRecord = await this.prisma.languages.findFirst({
                            where: { code: language }
                        })
                        if (languageRecord) {
                            testSetTranslationWhere.languageId = languageRecord.id
                        }
                    }

                    const testSetTranslations = await this.prisma.translation.findMany({
                        where: testSetTranslationWhere,
                        include: { language: true }
                    })

                    let testSetName: any = testSet.name
                    let testSetDescription: any = testSet.description
                    let testSetContent: any = testSet.content

                    if (language) {
                        const nameTranslation = testSetTranslations.find(t => t.key.startsWith(testSetNameKey + '.meaning.'))
                        const descriptionTranslation = testSetTranslations.find(t => t.key.startsWith(testSetDescriptionKey + '.meaning.'))
                        const contentTranslation = testSetTranslations.find(t => t.key.startsWith(testSetContentKey + '.meaning.'))

                        testSetName = nameTranslation?.value || testSet.name
                        testSetDescription = descriptionTranslation?.value || testSet.description
                        testSetContent = contentTranslation?.value || testSet.content
                    } else {
                        const nameTranslations = testSetTranslations.filter(t => t.key.startsWith(testSetNameKey + '.meaning.'))
                        const descriptionTranslations = testSetTranslations.filter(t => t.key.startsWith(testSetDescriptionKey + '.meaning.'))
                        const contentTranslations = testSetTranslations.filter(t => t.key.startsWith(testSetContentKey + '.meaning.'))

                        testSetName = nameTranslations.map(t => ({
                            language: t.language.code,
                            value: t.value
                        }))
                        testSetDescription = descriptionTranslations.map(t => ({
                            language: t.language.code,
                            value: t.value
                        }))
                        testSetContent = contentTranslations.map(t => ({
                            language: t.language.code,
                            value: t.value
                        }))
                    }

                    // Lấy questions + answers cho TestSet
                    const questionsResult = await this.testSetQuestionBankService.findFullWithAnswerByTestSetId(testSet.id, language)
                    const questions = questionsResult.data || []

                    return {
                        id: testSet.id,
                        name: testSetName,
                        description: testSetDescription,
                        content: testSetContent,
                        audioUrl: testSet.audioUrl,
                        testType: testSet.testType,
                        status: testSet.status,
                        levelN: testSet.levelN,
                        price: testSet.price ? Number(testSet.price) : null,
                        creator: testSet.creator,
                        questions: questions
                    }
                })
            )

            const result = {
                ...test,
                testSets: testSetsWithDetails
            }

            return {
                statusCode: 200,
                data: result,
                message: TEST_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error finding full test by ID:', error)
            if (error instanceof TestNotFoundException) {
                throw error
            }
            throw new BadRequestException('Không thể lấy thông tin bài test')
        }
    }

    async findFullByIdForUser(testId: number, language: string = 'vi'): Promise<MessageResDTO> {
        try {
            this.logger.log(`Finding full test by ID for user: ${testId}, language: ${language}`)

            // Lấy thông tin Test cơ bản
            const test = await this.testRepo.findById(testId, language)
            if (!test) {
                throw TestNotFoundException
            }

            // Lấy các TestSets của Test qua TestTestSet (không include creator cho user)
            const testTestSets = await (this.prisma as any).testTestSet.findMany({
                where: { testId },
                include: {
                    testSet: true
                },
                orderBy: { createdAt: 'asc' }
            })

            // Lấy translations và questions + answers cho từng TestSet
            const testSetsWithDetails = await Promise.all(
                testTestSets.map(async (testTestSet: any) => {
                    const testSet = testTestSet.testSet

                    // Lấy translations cho TestSet
                    const testSetNameKey = `testset.${testSet.id}.name`
                    const testSetDescriptionKey = `testset.${testSet.id}.description`
                    const testSetContentKey = `testset.${testSet.id}.content`

                    const testSetTranslationWhere: any = {
                        OR: [
                            { key: testSetNameKey },
                            { key: testSetDescriptionKey },
                            { key: testSetContentKey },
                            { key: { startsWith: testSetNameKey + '.meaning.' } },
                            { key: { startsWith: testSetDescriptionKey + '.meaning.' } },
                            { key: { startsWith: testSetContentKey + '.meaning.' } }
                        ]
                    }

                    if (language) {
                        const languageRecord = await this.prisma.languages.findFirst({
                            where: { code: language }
                        })
                        if (languageRecord) {
                            testSetTranslationWhere.languageId = languageRecord.id
                        }
                    }

                    const testSetTranslations = await this.prisma.translation.findMany({
                        where: testSetTranslationWhere,
                        include: { language: true }
                    })

                    let testSetName: any = testSet.name
                    let testSetDescription: any = testSet.description
                    let testSetContent: any = testSet.content

                    if (language) {
                        const nameTranslation = testSetTranslations.find(t => t.key.startsWith(testSetNameKey + '.meaning.'))
                        const descriptionTranslation = testSetTranslations.find(t => t.key.startsWith(testSetDescriptionKey + '.meaning.'))
                        const contentTranslation = testSetTranslations.find(t => t.key.startsWith(testSetContentKey + '.meaning.'))

                        testSetName = nameTranslation?.value || testSet.name
                        testSetDescription = descriptionTranslation?.value || testSet.description
                        testSetContent = contentTranslation?.value || testSet.content
                    } else {
                        const nameTranslations = testSetTranslations.filter(t => t.key.startsWith(testSetNameKey + '.meaning.'))
                        const descriptionTranslations = testSetTranslations.filter(t => t.key.startsWith(testSetDescriptionKey + '.meaning.'))
                        const contentTranslations = testSetTranslations.filter(t => t.key.startsWith(testSetContentKey + '.meaning.'))

                        testSetName = nameTranslations.map(t => ({
                            language: t.language.code,
                            value: t.value
                        }))
                        testSetDescription = descriptionTranslations.map(t => ({
                            language: t.language.code,
                            value: t.value
                        }))
                        testSetContent = contentTranslations.map(t => ({
                            language: t.language.code,
                            value: t.value
                        }))
                    }

                    // Lấy questions + answers cho TestSet
                    const questionsResult = await this.testSetQuestionBankService.findFullWithAnswerByTestSetId(testSet.id, language)
                    const questions = questionsResult.data || []

                    return {
                        id: testSet.id,
                        name: testSetName,
                        description: testSetDescription,
                        content: testSetContent,
                        audioUrl: testSet.audioUrl,
                        testType: testSet.testType,
                        status: testSet.status,
                        levelN: testSet.levelN,
                        price: testSet.price ? Number(testSet.price) : null,
                        questions: questions
                    }
                })
            )

            // Loại bỏ createdAt, updatedAt, creatorId khỏi test object
            const { createdAt, updatedAt, creatorId, ...testWithoutTimestamps } = test as any

            const result = {
                ...testWithoutTimestamps,
                testSets: testSetsWithDetails
            }

            return {
                statusCode: 200,
                data: result,
                message: TEST_MESSAGE.GET_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error finding full test by ID for user:', error)
            if (error instanceof TestNotFoundException) {
                throw error
            }
            throw new BadRequestException('Không thể lấy thông tin bài test')
        }
    }

    async autoAddFreeTestSets(): Promise<MessageResDTO> {
        try {
            this.logger.log('Starting auto-add free testSets to PLACEMENT_TEST_DONE tests')

            // Tìm tất cả Test có type PLACEMENT_TEST_DONE
            const placementTests = await this.prisma.test.findMany({
                where: {
                    testType: 'PLACEMENT_TEST_DONE',
                    status: 'ACTIVE'
                },
                select: {
                    id: true
                }
            })

            if (placementTests.length === 0) {
                this.logger.warn('No PLACEMENT_TEST_DONE tests found')
                return {
                    statusCode: 200,
                    data: {
                        totalTests: 0,
                        totalTestSetsAdded: 0
                    },
                    message: 'Không có Test PLACEMENT_TEST_DONE nào trong hệ thống'
                }
            }

            // Tìm tất cả TestSet có price = 0, status = ACTIVE, và testType là VOCABULARY, GRAMMAR, hoặc KANJI
            const freeTestSets = await this.prisma.testSet.findMany({
                where: {
                    price: 0,
                    status: 'ACTIVE',
                    testType: {
                        in: ['VOCABULARY', 'GRAMMAR', 'KANJI']
                    }
                },
                select: {
                    id: true
                }
            })

            if (freeTestSets.length === 0) {
                this.logger.warn('No free testSets found')
                return {
                    statusCode: 200,
                    data: {
                        totalTests: placementTests.length,
                        totalTestSetsAdded: 0
                    },
                    message: 'Không có TestSet free nào trong hệ thống'
                }
            }

            let totalAdded = 0

            // Thêm các TestSet free vào từng Test PLACEMENT_TEST_DONE
            for (const test of placementTests) {
                const testSetIds = freeTestSets.map(ts => ts.id)

                // Lấy danh sách TestSet đã có trong Test này
                const existingTestTestSets = await (this.prisma as any).testTestSet.findMany({
                    where: { testId: test.id },
                    select: { testSetId: true }
                })

                const existingTestSetIds = existingTestTestSets.map((tts: any) => tts.testSetId)
                const newTestSetIds = testSetIds.filter(id => !existingTestSetIds.includes(id))

                if (newTestSetIds.length > 0) {
                    await (this.prisma as any).testTestSet.createMany({
                        data: newTestSetIds.map(testSetId => ({
                            testId: test.id,
                            testSetId: testSetId
                        }))
                    })

                    totalAdded += newTestSetIds.length
                    this.logger.log(`Added ${newTestSetIds.length} testSets to Test ID ${test.id}`)
                }
            }

            this.logger.log(`Successfully added ${totalAdded} testSets to ${placementTests.length} tests`)

            return {
                statusCode: 200,
                data: {
                    totalTests: placementTests.length,
                    totalTestSetsAdded: totalAdded
                },
                message: `Đã thêm ${totalAdded} TestSet vào ${placementTests.length} Test PLACEMENT_TEST_DONE`
            }
        } catch (error) {
            this.logger.error('Error auto-adding free testSets:', error)
            throw new BadRequestException('Không thể tự động thêm TestSet')
        }
    }

    async getRandomQuestionsForPlacementTest(testId: number, userId: number, language: string = 'vi'): Promise<MessageResDTO> {
        try {
            this.logger.log(`Getting random questions for placement test: ${testId}, user: ${userId}, language: ${language}`)

            // Validate test tồn tại và là PLACEMENT_TEST_DONE
            const test = await this.testRepo.findById(testId)
            if (!test) {
                throw TestNotFoundException
            }

            if (test.testType !== 'PLACEMENT_TEST_DONE') {
                throw new BadRequestException('Chỉ có thể lấy câu hỏi từ Test loại PLACEMENT_TEST_DONE')
            }

            // Kiểm tra UserTest tồn tại và limit
            const userTest = await this.userTestRepo.findByUserAndTest(userId, testId)
            if (!userTest) {
                throw new BadRequestException('Bạn chưa có quyền làm bài test này')
            }

            // Lấy attempt được tạo gần nhất của userId và testId (không phân biệt status)
            const latestAttempt = await this.prisma.userTestAttempt.findFirst({
                where: {
                    userId,
                    testId
                },
                orderBy: {
                    createdAt: 'desc' // Lấy attempt được tạo gần nhất
                }
            })

            let userTestAttempt

            // Nếu có attempt gần nhất và là IN_PROGRESS → dùng lại (xử lý trường hợp rớt mạng)
            if (latestAttempt && latestAttempt.status === 'IN_PROGRESS') {
                // Sử dụng attempt đó (không tạo mới, không giảm limit)
                // Xóa tất cả UserTestAnswerLog của attempt này để bắt đầu lại từ đầu
                this.logger.log(`Found existing IN_PROGRESS UserTestAttempt with ID: ${latestAttempt.id} for user ${userId} and test ${testId}`)

                const deletedLogsCount = await this.prisma.userTestAnswerLog.deleteMany({
                    where: {
                        userTestAttemptId: latestAttempt.id
                    }
                })
                this.logger.log(`Deleted ${deletedLogsCount.count} UserTestAnswerLog for attempt ${latestAttempt.id}`)

                userTestAttempt = {
                    id: latestAttempt.id,
                    userId: latestAttempt.userId,
                    testId: latestAttempt.testId,
                    status: latestAttempt.status,
                    time: latestAttempt.time,
                    score: latestAttempt.score,
                    createdAt: latestAttempt.createdAt,
                    updatedAt: latestAttempt.updatedAt
                }
            } else {
                // Nếu attempt gần nhất là COMPLETED hoặc không có attempt nào (lần đầu) → tạo mới
                if (latestAttempt && latestAttempt.status === 'COMPLETED') {
                    this.logger.log(`Found COMPLETED attempt (ID: ${latestAttempt.id}), creating new UserTestAttempt for user ${userId} and test ${testId}`)
                } else {
                    this.logger.log(`No existing attempt found (first time), creating new UserTestAttempt for user ${userId} and test ${testId}`)
                }

                // Tạo UserTestAttempt mới (không giảm limit)
                userTestAttempt = await this.userTestAttemptRepo.create({
                    userId,
                    testId
                })

                this.logger.log(`Created new UserTestAttempt with ID: ${userTestAttempt.id}`)
            }

            // Lấy các TestSets của Test
            const testTestSets = await (this.prisma as any).testTestSet.findMany({
                where: { testId },
                select: { testSetId: true }
            })

            if (testTestSets.length === 0) {
                throw new BadRequestException('Test này chưa có TestSet nào')
            }

            const testSetIds = testTestSets.map((tts: any) => tts.testSetId)

            // Lấy tất cả câu hỏi từ các TestSets, nhóm theo levelN
            const allQuestions = await this.prisma.testSetQuestionBank.findMany({
                where: {
                    testSetId: { in: testSetIds }
                },
                include: {
                    questionBank: {
                        include: {
                            answers: true
                        }
                    }
                }
            })

            // Chỉ lấy các loại VOCABULARY, GRAMMAR, KANJI
            const filteredQuestions = allQuestions.filter(
                tsqb => ['VOCABULARY', 'GRAMMAR', 'KANJI'].includes(tsqb.questionBank.questionType)
            )

            // Nhóm câu hỏi theo levelN
            const questionsByLevel = {
                5: filteredQuestions.filter(q => q.questionBank.levelN === 5),
                4: filteredQuestions.filter(q => q.questionBank.levelN === 4),
                3: filteredQuestions.filter(q => q.questionBank.levelN === 3),
                2: filteredQuestions.filter(q => q.questionBank.levelN === 2),
                1: filteredQuestions.filter(q => q.questionBank.levelN === 1)
            }

            // Shuffle và lấy số lượng câu hỏi theo tỷ lệ: 3 câu N5, 4 câu N4, 3 câu N3
            const shuffleArray = <T>(array: T[]): T[] => {
                const shuffled = [...array]
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                }
                return shuffled
            }

            const getRandomQuestions = <T>(array: T[], count: number): T[] => {
                const shuffled = shuffleArray(array)
                return shuffled.slice(0, count)
            }

            const selectedN5 = getRandomQuestions(questionsByLevel[5], 3)
            const selectedN4 = getRandomQuestions(questionsByLevel[4], 4)
            const selectedN3 = getRandomQuestions(questionsByLevel[3], 3)

            // Kiểm tra nếu không đủ câu hỏi
            if (selectedN5.length < 3) {
                this.logger.warn(`Chỉ có ${selectedN5.length} câu N5, cần 3`)
            }
            if (selectedN4.length < 4) {
                this.logger.warn(`Chỉ có ${selectedN4.length} câu N4, cần 4`)
            }
            if (selectedN3.length < 3) {
                this.logger.warn(`Chỉ có ${selectedN3.length} câu N3, cần 3`)
            }

            // Merge và shuffle lại tất cả câu hỏi đã chọn
            const allSelected = [...selectedN5, ...selectedN4, ...selectedN3]
            const finalQuestions = shuffleArray(allSelected)

            // Map với translations và answers
            const mappedQuestions = await Promise.all(
                finalQuestions.map(async (tsqb: any) => {
                    const qb = tsqb.questionBank

                    // Lấy translations cho question nếu có
                    let questionTranslation = qb.questionJp
                    if (qb.questionKey && language) {
                        const languageRecord = await this.prisma.languages.findFirst({
                            where: { code: language }
                        })
                        if (languageRecord) {
                            const translation = await this.prisma.translation.findFirst({
                                where: {
                                    key: qb.questionKey,
                                    languageId: languageRecord.id
                                }
                            })
                            if (translation) {
                                questionTranslation = translation.value
                            }
                        }
                    }

                    // Map answers với translations
                    const mappedAnswers = await Promise.all(
                        (qb.answers || []).map(async (ans: any) => {
                            let answerTranslation = ans.answerJp

                            if (ans.answerKey && language) {
                                const languageRecord = await this.prisma.languages.findFirst({
                                    where: { code: language }
                                })
                                if (languageRecord) {
                                    const translation = await this.prisma.translation.findFirst({
                                        where: {
                                            key: ans.answerKey,
                                            languageId: languageRecord.id
                                        }
                                    })
                                    if (translation) {
                                        answerTranslation = translation.value
                                    }
                                }
                            }

                            return {
                                id: ans.id,
                                answer: answerTranslation
                            }
                        })
                    )

                    return {
                        id: tsqb.questionBankId,
                        question: questionTranslation,
                        questionType: qb.questionType,
                        audioUrl: qb.audioUrl,
                        pronunciation: qb.pronunciation,
                        levelN: qb.levelN,
                        answers: shuffleArray(mappedAnswers) // Shuffle answers
                    }
                })
            )

            this.logger.log(`Selected ${finalQuestions.length} questions: ${selectedN5.length} N5, ${selectedN4.length} N4, ${selectedN3.length} N3`)

            return {
                statusCode: 200,
                data: {
                    userTestAttemptId: userTestAttempt.id,
                    questions: mappedQuestions,
                    distribution: {
                        level5: selectedN5.length,
                        level4: selectedN4.length,
                        level3: selectedN3.length,
                        total: finalQuestions.length
                    }
                },
                message: 'Lấy câu hỏi placement test thành công'
            }
        } catch (error) {
            this.logger.error('Error getting random questions for placement test:', error)
            if (error instanceof TestNotFoundException) {
                throw error
            }
            throw new BadRequestException('Không thể lấy câu hỏi cho placement test')
        }
    }

    async getRandomQuestionsByLevel(testId: number, levelN: number, count: number, language: string = 'vi'): Promise<MessageResDTO> {
        try {
            this.logger.log(`Getting ${count} random questions for level ${levelN} from test: ${testId}, language: ${language}`)

            // Validate
            if (![1, 2, 3, 4, 5].includes(levelN)) {
                throw new BadRequestException('Level phải từ 1 đến 5')
            }
            if (count < 1) {
                throw new BadRequestException('Số lượng câu hỏi phải lớn hơn 0')
            }

            // Validate test tồn tại
            const test = await this.testRepo.findById(testId)
            if (!test) {
                throw TestNotFoundException
            }

            // Lấy các TestSets của Test
            const testTestSets = await (this.prisma as any).testTestSet.findMany({
                where: { testId },
                select: { testSetId: true }
            })

            if (testTestSets.length === 0) {
                throw new BadRequestException('Test này chưa có TestSet nào')
            }

            const testSetIds = testTestSets.map((tts: any) => tts.testSetId)

            // Lấy tất cả câu hỏi có levelN cụ thể
            const allQuestions = await this.prisma.testSetQuestionBank.findMany({
                where: {
                    testSetId: { in: testSetIds },
                    questionBank: {
                        levelN: levelN
                    }
                },
                include: {
                    questionBank: {
                        include: {
                            answers: true
                        }
                    }
                }
            })

            // Shuffle và lấy số lượng cần thiết
            const shuffleArray = <T>(array: T[]): T[] => {
                const shuffled = [...array]
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                }
                return shuffled
            }

            const selectedQuestions = shuffleArray(allQuestions).slice(0, count)

            // Kiểm tra nếu không đủ câu hỏi
            if (selectedQuestions.length < count) {
                this.logger.warn(`Chỉ có ${selectedQuestions.length} câu level ${levelN}, yêu cầu ${count}`)
            }

            // Map với translations và answers
            const mappedQuestions = await Promise.all(
                selectedQuestions.map(async (tsqb: any) => {
                    const qb = tsqb.questionBank

                    // Lấy translations cho question nếu có
                    let questionTranslation = qb.questionJp
                    if (qb.questionKey && language) {
                        const languageRecord = await this.prisma.languages.findFirst({
                            where: { code: language }
                        })
                        if (languageRecord) {
                            const translation = await this.prisma.translation.findFirst({
                                where: {
                                    key: qb.questionKey,
                                    languageId: languageRecord.id
                                }
                            })
                            if (translation) {
                                questionTranslation = translation.value
                            }
                        }
                    }

                    // Map answers với translations
                    const mappedAnswers = await Promise.all(
                        (qb.answers || []).map(async (ans: any) => {
                            let answerTranslation = ans.answerJp

                            if (ans.answerKey && language) {
                                const languageRecord = await this.prisma.languages.findFirst({
                                    where: { code: language }
                                })
                                if (languageRecord) {
                                    const translation = await this.prisma.translation.findFirst({
                                        where: {
                                            key: ans.answerKey,
                                            languageId: languageRecord.id
                                        }
                                    })
                                    if (translation) {
                                        answerTranslation = translation.value
                                    }
                                }
                            }

                            return {
                                id: ans.id,
                                answer: answerTranslation,
                                isCorrect: ans.isCorrect
                            }
                        })
                    )

                    return {
                        id: qb.id,
                        question: questionTranslation,
                        questionType: qb.questionType,
                        audioUrl: qb.audioUrl,
                        pronunciation: qb.pronunciation,
                        levelN: qb.levelN,
                        answers: shuffleArray(mappedAnswers), // Shuffle answers
                        isCorrect: undefined // Ẩn đáp án đúng khi trả về
                    }
                })
            )

            this.logger.log(`Selected ${mappedQuestions.length} questions for level ${levelN}`)

            return {
                statusCode: 200,
                data: {
                    questions: mappedQuestions,
                    levelN,
                    count: mappedQuestions.length
                },
                message: `Lấy ${mappedQuestions.length} câu hỏi level N${levelN} thành công`
            }
        } catch (error) {
            this.logger.error('Error getting random questions by level:', error)
            if (error instanceof TestNotFoundException) {
                throw error
            }
            throw new BadRequestException('Không thể lấy câu hỏi')
        }
    }
}

