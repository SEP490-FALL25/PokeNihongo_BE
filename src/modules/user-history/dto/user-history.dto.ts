import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export enum HistoryType {
    TEST = 'TEST',
    EXERCISE = 'EXERCISE'
}

export class HistoryItemSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID của attempt' })
    id: number

    @ApiProperty({ enum: HistoryType, example: HistoryType.TEST, description: 'Loại lịch sử (TEST hoặc EXERCISE)' })
    type: HistoryType

    @ApiPropertyOptional({ example: 1, description: 'ID của Test (nếu type = TEST)' })
    testId?: number | null

    @ApiPropertyOptional({ example: 'Kiểm tra từ vựng N3', description: 'Tên test (nếu type = TEST)' })
    testName?: string | null

    @ApiPropertyOptional({ example: 1, description: 'ID của Exercise (nếu type = EXERCISE)' })
    exerciseId?: number | null

    @ApiPropertyOptional({ example: 'Bài tập N3', description: 'Tên exercise (nếu type = EXERCISE)' })
    exerciseName?: string | null

    @ApiProperty({ example: 'COMPLETED', description: 'Trạng thái (COMPLETED, FAIL, etc.)' })
    status: string

    @ApiPropertyOptional({ example: 80, description: 'Điểm số (%)' })
    score?: number | null

    @ApiProperty({ example: 10, description: 'Tổng số câu hỏi' })
    totalQuestions: number

    @ApiProperty({ example: 8, description: 'Số câu trả lời đúng' })
    correctAnswers: number

    @ApiProperty({ example: 2, description: 'Số câu trả lời sai' })
    incorrectAnswers: number

    @ApiPropertyOptional({ example: 1200, description: 'Thời gian làm bài (giây)' })
    time?: number | null

    @ApiProperty({ example: '2024-01-01T10:00:00.000Z', description: 'Thời gian tạo' })
    createdAt: Date

    @ApiProperty({ example: '2024-01-01T10:20:00.000Z', description: 'Thời gian cập nhật' })
    updatedAt: Date
}

export class AdminHistoryItemSwaggerDTO extends HistoryItemSwaggerDTO {
    @ApiPropertyOptional({ example: 1, description: 'ID của user (chỉ có trong admin response)' })
    userId?: number

    @ApiPropertyOptional({
        type: 'object',
        properties: {
            id: { type: 'number', example: 1 },
            email: { type: 'string', example: 'user@example.com' }
        },
        description: 'Thông tin user (chỉ có trong admin response)'
    })
    user?: {
        id: number
        email?: string | null
    }
}

export class GetHistoryListQuerySwaggerDTO {
    @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại' })
    currentPage?: number

    @ApiPropertyOptional({ example: 10, description: 'Số item mỗi trang' })
    pageSize?: number

    @ApiPropertyOptional({ enum: HistoryType, example: HistoryType.TEST, description: 'Filter theo loại (TEST hoặc EXERCISE)' })
    type?: HistoryType

    @ApiPropertyOptional({ example: 'COMPLETED', description: 'Filter theo status' })
    status?: string
}

export class GetAdminHistoryListQuerySwaggerDTO {
    @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại' })
    currentPage?: number

    @ApiPropertyOptional({ example: 10, description: 'Số item mỗi trang' })
    pageSize?: number

    @ApiPropertyOptional({ enum: HistoryType, example: HistoryType.TEST, description: 'Filter theo loại (TEST hoặc EXERCISE)' })
    type?: HistoryType

    @ApiPropertyOptional({ example: 'COMPLETED', description: 'Filter theo status' })
    status?: string

    @ApiPropertyOptional({ example: 1, description: 'Filter theo userId (Admin có thể xem lịch sử của user cụ thể)' })
    userId?: number
}

export class HistoryListResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
    statusCode: number

    @ApiProperty({
        type: 'object',
        properties: {
            results: {
                type: 'array',
                items: { $ref: '#/components/schemas/HistoryItemSwaggerDTO' }
            },
            pagination: {
                type: 'object',
                properties: {
                    current: { type: 'number', example: 1 },
                    pageSize: { type: 'number', example: 10 },
                    totalPage: { type: 'number', example: 5 },
                    totalItem: { type: 'number', example: 50 }
                }
            }
        },
        description: 'Dữ liệu danh sách lịch sử và phân trang'
    })
    data: {
        results: HistoryItemSwaggerDTO[]
        pagination: {
            current: number
            pageSize: number
            totalPage: number
            totalItem: number
        }
    }

    @ApiProperty({ example: 'Lấy danh sách lịch sử thành công', description: 'Thông báo' })
    message: string
}

export class AdminHistoryListResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
    statusCode: number

    @ApiProperty({
        type: 'object',
        properties: {
            results: {
                type: 'array',
                items: { $ref: '#/components/schemas/AdminHistoryItemSwaggerDTO' }
            },
            pagination: {
                type: 'object',
                properties: {
                    current: { type: 'number', example: 1 },
                    pageSize: { type: 'number', example: 10 },
                    totalPage: { type: 'number', example: 5 },
                    totalItem: { type: 'number', example: 50 }
                }
            }
        },
        description: 'Dữ liệu danh sách lịch sử và phân trang (Admin - có thêm thông tin user)'
    })
    data: {
        results: AdminHistoryItemSwaggerDTO[]
        pagination: {
            current: number
            pageSize: number
            totalPage: number
            totalItem: number
        }
    }

    @ApiProperty({ example: 'Lấy danh sách lịch sử thành công', description: 'Thông báo' })
    message: string
}

export enum RecentLessonType {
    LESSON = 'LESSON',
    EXERCISE = 'EXERCISE'
}

export class RecentLessonItemSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID của progress hoặc attempt' })
    id: number

    @ApiProperty({ enum: RecentLessonType, example: RecentLessonType.LESSON, description: 'Loại (LESSON hoặc EXERCISE)' })
    type: RecentLessonType

    @ApiPropertyOptional({ example: 1, description: 'ID của Lesson (nếu type = LESSON)' })
    lessonId?: number | null

    @ApiPropertyOptional({ example: 'Bài tập đọc hiểu 4', description: 'Tiêu đề bài học (nếu type = LESSON)' })
    lessonTitle?: string | null

    @ApiPropertyOptional({ example: 'bai-tap-doc-hieu-4', description: 'Slug của bài học (nếu type = LESSON)' })
    lessonSlug?: string | null

    @ApiPropertyOptional({ example: 'N3 JUNBI > Bài 4', description: 'Tên danh mục bài học (nếu type = LESSON)' })
    lessonCategoryName?: string | null

    @ApiPropertyOptional({ example: 1, description: 'ID của Exercise (nếu type = EXERCISE)' })
    exerciseId?: number | null

    @ApiPropertyOptional({ example: 'TT - Flashcard N3KT TỪ V...', description: 'Tên exercise (nếu type = EXERCISE)' })
    exerciseName?: string | null

    @ApiProperty({ example: 'IN_PROGRESS', description: 'Trạng thái (IN_PROGRESS hoặc COMPLETED)' })
    status: string

    @ApiPropertyOptional({ example: 75, description: 'Phần trăm hoàn thành (0-100, chỉ có cho LESSON)' })
    progressPercentage?: number | null

    @ApiPropertyOptional({ example: '2024-01-01T10:00:00.000Z', description: 'Thời gian truy cập cuối (chỉ có cho LESSON)' })
    lastAccessedAt?: Date | null

    @ApiPropertyOptional({ example: '2024-01-01T10:20:00.000Z', description: 'Thời gian hoàn thành' })
    completedAt?: Date | null

    @ApiProperty({ example: '2024-01-01T10:20:00.000Z', description: 'Thời gian cập nhật' })
    updatedAt: Date
}

export class GetRecentLessonsQuerySwaggerDTO {
    @ApiPropertyOptional({ example: 1, description: 'Trang hiện tại' })
    currentPage?: number

    @ApiPropertyOptional({ example: 10, description: 'Số item mỗi trang' })
    pageSize?: number

    @ApiPropertyOptional({ enum: ['IN_PROGRESS', 'COMPLETED'], example: 'IN_PROGRESS', description: 'Filter theo status' })
    status?: 'IN_PROGRESS' | 'COMPLETED'
}

export class RecentLessonsResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
    statusCode: number

    @ApiProperty({
        type: 'object',
        properties: {
            results: {
                type: 'array',
                items: { $ref: '#/components/schemas/RecentLessonItemSwaggerDTO' }
            },
            pagination: {
                type: 'object',
                properties: {
                    current: { type: 'number', example: 1 },
                    pageSize: { type: 'number', example: 10 },
                    totalPage: { type: 'number', example: 5 },
                    totalItem: { type: 'number', example: 50 }
                }
            }
        },
        description: 'Dữ liệu danh sách bài học gần đây và phân trang'
    })
    data: {
        results: RecentLessonItemSwaggerDTO[]
        pagination: {
            current: number
            pageSize: number
            totalPage: number
            totalItem: number
        }
    }

    @ApiProperty({ example: 'Lấy danh sách bài học gần đây thành công', description: 'Thông báo' })
    message: string
}

