import { ApiProperty } from '@nestjs/swagger'

export class UserExerciseAttemptSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID của lần thử bài tập' })
    id: number

    @ApiProperty({ example: 1, description: 'ID người dùng' })
    userId: number

    @ApiProperty({ example: 1, description: 'ID bài tập' })
    exerciseId: number

    @ApiProperty({
        example: 'IN_PROGRESS',
        description: 'Trạng thái làm bài: IN_PROGRESS (đang làm), COMPLETED (hoàn thành), ABANDONED (bỏ dở)',
        enum: ['IN_PROGRESS', 'COMPLETED', 'ABANDONED']
    })
    status: string

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
    createdAt: Date

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
    updatedAt: Date
}

export class UpdateUserExerciseAttemptSwaggerDTO {
    @ApiProperty({
        example: 'COMPLETED',
        description: 'Trạng thái làm bài: IN_PROGRESS (đang làm), COMPLETED (hoàn thành), ABANDONED (bỏ dở)',
        enum: ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
        required: false
    })
    status?: string
}

export class UserExerciseAttemptResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Status code' })
    statusCode: number

    @ApiProperty({ type: UserExerciseAttemptSwaggerDTO, description: 'Dữ liệu lần thử bài tập' })
    data: UserExerciseAttemptSwaggerDTO

    @ApiProperty({ example: 'Lấy thông tin lần thử bài tập thành công', description: 'Thông báo' })
    message: string
}

export class UserExerciseAttemptListResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Status code' })
    statusCode: number

    @ApiProperty({
        description: 'Dữ liệu danh sách lần thử bài tập',
        properties: {
            results: {
                type: 'array',
                items: { $ref: '#/components/schemas/UserExerciseAttemptSwaggerDTO' }
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
        }
    })
    data: {
        results: UserExerciseAttemptSwaggerDTO[]
        pagination: {
            current: number
            pageSize: number
            totalPage: number
            totalItem: number
        }
    }

    @ApiProperty({ example: 'Lấy danh sách lần thử bài tập thành công', description: 'Thông báo' })
    message: string
}

export class CreateUserExerciseAttemptParamsSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID bài tập' })
    exerciseId: number
}

export class GetUserExerciseAttemptListQuerySwaggerDTO {
    @ApiProperty({ example: 1, description: 'Trang hiện tại', required: false })
    currentPage?: number

    @ApiProperty({ example: 10, description: 'Số bản ghi mỗi trang', required: false })
    pageSize?: number

    @ApiProperty({ example: 1, description: 'ID người dùng', required: false })
    userId?: number

    @ApiProperty({ example: 1, description: 'ID bài tập', required: false })
    exerciseId?: number

    @ApiProperty({
        example: 'IN_PROGRESS',
        description: 'Lọc theo trạng thái: IN_PROGRESS (đang làm), COMPLETED (hoàn thành), ABANDONED (bỏ dở)',
        enum: ['IN_PROGRESS', 'COMPLETED', 'ABANDONED'],
        required: false
    })
    status?: string
}


