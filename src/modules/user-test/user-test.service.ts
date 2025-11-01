import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { UserTestRepository } from './user-test.repo'
import { CreateUserTestBodyType, UpdateUserTestBodyType, GetUserTestListQueryType } from './entities/user-test.entities'
import { USER_TEST_MESSAGE } from '@/common/constants/message'
import { UserTestStatus, TestStatus } from '@prisma/client'
import { PrismaService } from '@/shared/services/prisma.service'

@Injectable()
export class UserTestService {
    private readonly logger = new Logger(UserTestService.name)

    constructor(
        private readonly userTestRepo: UserTestRepository,
        private readonly prisma: PrismaService
    ) { }

    async create(body: CreateUserTestBodyType) {
        try {
            // Kiểm tra xem đã tồn tại UserTest cho user và test này chưa
            const existingUserTest = await this.userTestRepo.findByUserAndTest(Number(body.userId), Number(body.testId))
            if (existingUserTest) {
                throw new Error('UserTest đã tồn tại')
            }

            const userTest = await this.userTestRepo.create(body)

            return {
                statusCode: 201,
                data: userTest,
                message: USER_TEST_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating user test:', error)
            throw error
        }
    }

    async findAll(query: GetUserTestListQueryType, language?: string) {
        const result = await this.userTestRepo.findMany(query)

        // Nếu có language, lấy thông tin Test với translations cho mỗi UserTest
        if (language && result.items.length > 0) {
            const userTestsWithTestInfo = await Promise.all(
                result.items.map(async (userTest) => {
                    const test = await this.userTestRepo.getTestById(userTest.testId, language)
                    // Loại bỏ testId, createdAt, updatedAt và thêm thông tin test
                    const { testId, createdAt, updatedAt, ...userTestWithoutIdAndDates } = userTest
                    return {
                        ...userTestWithoutIdAndDates,
                        test: test ? {
                            id: test.id,
                            name: test.name,
                            description: test.description,
                            price: test.price,
                            levelN: test.levelN,
                            testType: test.testType,
                            status: test.status,
                            limit: test.limit
                        } : null
                    }
                })
            )

            return {
                statusCode: 200,
                message: USER_TEST_MESSAGE.GET_LIST_SUCCESS,
                data: {
                    results: userTestsWithTestInfo,
                    pagination: {
                        current: result.page,
                        pageSize: result.limit,
                        totalPage: Math.ceil(result.total / result.limit),
                        totalItem: result.total
                    }
                }
            }
        }

        return {
            statusCode: 200,
            message: USER_TEST_MESSAGE.GET_LIST_SUCCESS,
            data: {
                results: result.items,
                pagination: {
                    current: result.page,
                    pageSize: result.limit,
                    totalPage: Math.ceil(result.total / result.limit),
                    totalItem: result.total
                }
            }
        }
    }

    async findOne(id: number) {
        const userTest = await this.userTestRepo.findById(id)
        if (!userTest) {
            throw new Error('UserTest không tồn tại')
        }

        return {
            statusCode: 200,
            data: userTest,
            message: USER_TEST_MESSAGE.GET_SUCCESS
        }
    }

    async update(id: number, data: UpdateUserTestBodyType) {
        const userTest = await this.userTestRepo.update(id, data)

        return {
            statusCode: 200,
            data: userTest,
            message: USER_TEST_MESSAGE.UPDATE_SUCCESS
        }
    }

    async delete(id: number) {
        await this.userTestRepo.delete(id)

        return {
            statusCode: 200,
            message: USER_TEST_MESSAGE.DELETE_SUCCESS
        }
    }

    /**
     * Khởi tạo UserTest cho user mới đăng ký
     * Add tất cả Test có status = ACTIVE (trừ MATCH_TEST) vào UserTest
     * Tạo mới hoặc cập nhật nếu đã tồn tại
     */
    async initUserTests(userId: number): Promise<void> {
        try {
            this.logger.log(`Initializing user tests for user ${userId}`)

            // Lấy tất cả Test có status = ACTIVE và KHÔNG phải MATCH_TEST
            const tests = await this.userTestRepo.getActiveTests()

            if (tests.length === 0) {
                this.logger.warn('No active tests found in the system')
                return
            }

            // Tạo UserTest cho tất cả test
            // SUBSCRIPTION_TEST -> status NOT_STARTED
            // Test khác -> status ACTIVE
            // Copy limit từ test vào UserTest
            const userTestData = tests.map(test => ({
                userId,
                testId: test.id,
                status: test.testType === TestStatus.SUBSCRIPTION_TEST
                    ? UserTestStatus.NOT_STARTED
                    : UserTestStatus.ACTIVE,
                limit: test.limit
            }))

            // Sử dụng bulk upsert để tạo hoặc cập nhật UserTest
            await this.userTestRepo.bulkUpsert(userTestData)

            this.logger.log(`Successfully initialized ${userTestData.length} user test records for user ${userId}`)
        } catch (error) {
            this.logger.error(`Error initializing user tests for user ${userId}:`, error)
            // Không throw error để không ảnh hưởng đến quá trình tạo tài khoản
        }
    }

    /**
     * Khởi tạo UserTest cho TẤT CẢ user có trong hệ thống
     * Add tất cả Test có status = ACTIVE (trừ MATCH_TEST)
     * SUBSCRIPTION_TEST -> status NOT_STARTED, các test khác -> status ACTIVE
     */
    async initAllUsersTests(): Promise<any> {
        try {
            this.logger.log('Starting initialization of user tests for all users')

            // Lấy tất cả user có trong hệ thống
            const users = await this.userTestRepo.getAllUsers()

            if (users.length === 0) {
                this.logger.warn('No users found in the system')
                return {
                    statusCode: 200,
                    message: 'Không có user nào trong hệ thống',
                    data: {
                        totalUsers: 0,
                        totalTestsAdded: 0
                    }
                }
            }

            // Lấy tất cả Test có status = ACTIVE và KHÔNG phải MATCH_TEST
            const tests = await this.userTestRepo.getActiveTests()

            if (tests.length === 0) {
                this.logger.warn('No active tests found in the system')
                return {
                    statusCode: 200,
                    message: 'Không có test nào ACTIVE trong hệ thống',
                    data: {
                        totalUsers: users.length,
                        totalTestsAdded: 0
                    }
                }
            }

            // Tạo UserTest cho tất cả user và tất cả test
            // SUBSCRIPTION_TEST -> status NOT_STARTED
            // Test khác -> status ACTIVE
            // Copy limit từ test vào UserTest
            const userTestData: Array<{
                userId: number
                testId: number
                status: UserTestStatus
                limit: number | null
            }> = []

            for (const user of users) {
                for (const test of tests) {
                    userTestData.push({
                        userId: user.id,
                        testId: test.id,
                        status: test.testType === TestStatus.SUBSCRIPTION_TEST
                            ? UserTestStatus.NOT_STARTED
                            : UserTestStatus.ACTIVE,
                        limit: test.limit
                    })
                }
            }

            // Sử dụng bulk upsert để tạo hoặc cập nhật UserTest
            await this.userTestRepo.bulkUpsert(userTestData)

            this.logger.log(`Successfully initialized user tests for ${users.length} users with ${tests.length} tests each`)

            return {
                statusCode: 200,
                message: `Khởi tạo thành công ${tests.length} test cho ${users.length} user`,
                data: {
                    totalUsers: users.length,
                    totalTests: tests.length,
                    totalUserTests: userTestData.length
                }
            }
        } catch (error) {
            this.logger.error('Error initializing user tests for all users:', error)
            throw error
        }
    }

    // Hàm tự động cập nhật limit của UserTest theo Test (trừ PLACEMENT_TEST_DONE)
    // Chạy mỗi ngày lúc 00:00 giờ HCM (UTC+7)
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
        timeZone: 'Asia/Ho_Chi_Minh'
    })
    async runAutoTest(): Promise<void> {
        try {
            this.logger.log('[UserTest Auto Limit Update] Starting automatic limit update for UserTest')

            // Lấy tất cả Test có status = ACTIVE, KHÔNG phải MATCH_TEST và KHÔNG phải PLACEMENT_TEST_DONE
            const tests = await this.prisma.test.findMany({
                where: {
                    status: 'ACTIVE',
                    testType: {
                        notIn: ['MATCH_TEST', 'PLACEMENT_TEST_DONE']
                    }
                },
                select: {
                    id: true,
                    testType: true,
                    limit: true
                }
            })

            if (tests.length === 0) {
                this.logger.warn('No tests found to update')
                return
            }

            let totalUpdated = 0

            // Cập nhật limit cho từng test
            for (const test of tests) {
                const result = await this.prisma.userTest.updateMany({
                    where: {
                        testId: test.id
                    },
                    data: {
                        limit: test.limit
                    }
                })

                totalUpdated += result.count
                this.logger.log(`Updated ${result.count} UserTest records for Test ID ${test.id} with limit ${test.limit}`)
            }

            this.logger.log(`Successfully updated ${totalUpdated} UserTest records`)
        } catch (error) {
            this.logger.error('Error running automatic limit update:', error)
        }
    }
}

