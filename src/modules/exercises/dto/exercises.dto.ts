import { ApiProperty } from '@nestjs/swagger'
import { ExercisesSortField, SortOrder } from '@/common/enum/enum'

// Swagger DTOs - for API documentation only
export class CreateExercisesSwaggerDTO {

    @ApiProperty({
        example: 'multiple_choice',
        description: 'Loại bài tập QUIZ, multiple_choice, matching, listening, speaking',
        enum: ['QUIZ', 'multiple_choice', 'matching', 'listening', 'speaking']
    })
    exerciseType: string

    @ApiProperty({ example: false, description: 'Trạng thái bị chặn' })
    isBlocked?: boolean

    @ApiProperty({ example: 1, description: 'ID bài học' })
    lessonId: number

    @ApiProperty({ example: 1, description: 'ID bộ đề' })
    testSetId: number
}

export class UpdateExercisesSwaggerDTO {

    @ApiProperty({
        example: 'multiple_choice',
        description: 'Loại bài tập QUIZ, multiple_choice, matching, listening, speaking',
        enum: ['QUIZ', 'multiple_choice', 'matching', 'listening', 'speaking'],
        required: false
    })
    exerciseType?: string

    @ApiProperty({ example: false, description: 'Trạng thái bị chặn', required: false })
    isBlocked?: boolean

    @ApiProperty({ example: 1, description: 'ID bài học', required: false })
    lessonId?: number
}

export class GetExercisesListQuerySwaggerDTO {
    @ApiProperty({ example: 1, description: 'Số trang hiện tại', required: false })
    currentPage?: number

    @ApiProperty({ example: 10, description: 'Số lượng bài tập mỗi trang', required: false })
    pageSize?: number

    @ApiProperty({
        example: 'multiple_choice',
        description: 'Lọc theo loại bài tập QUIZ, multiple_choice, matching, listening, speaking',
        enum: ['QUIZ', 'multiple_choice', 'matching', 'listening', 'speaking'],
        required: false
    })
    exerciseType?: string

    @ApiProperty({ example: 1, description: 'Lọc theo ID bài học', required: false })
    lessonId?: number

    @ApiProperty({ example: false, description: 'Lọc theo trạng thái bị chặn', required: false })
    isBlocked?: boolean

    @ApiProperty({ example: '文法', description: 'Từ khóa tìm kiếm theo content', required: false })
    search?: string

    @ApiProperty({
        enum: ExercisesSortField,
        example: ExercisesSortField.CREATED_AT,
        description: 'Field để sắp xếp theo exerciseType, isBlocked, price, lessonId, createdAt, updatedAt',
        required: false
    })
    sortBy?: ExercisesSortField

    @ApiProperty({
        enum: SortOrder,
        example: SortOrder.DESC,
        description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
        required: false
    })
    sort?: SortOrder
}

export class ExercisesResponseSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID' })
    id: number


    @ApiProperty({ example: 'multiple_choice', description: 'Loại bài tập' })
    exerciseType: string


    @ApiProperty({ example: 'この練習では文法を学びます', description: 'Nội dung mô tả bài tập' })
    content: string

    @ApiProperty({ example: 'https://example.com/audio.mp3', description: 'URL file âm thanh' })
    audioUrl: string

    @ApiProperty({ example: false, description: 'Trạng thái bị chặn' })
    isBlocked: boolean

    @ApiProperty({ example: 0.99, description: 'Giá bài tập' })
    price: number

    @ApiProperty({ example: 1, description: 'ID bài học' })
    lessonId: number

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
    createdAt: Date

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
    updatedAt: Date
}

export class ExercisesListResponseSwaggerDTO {
    @ApiProperty({ type: [ExercisesResponseSwaggerDTO], description: 'Danh sách bài tập' })
    data: ExercisesResponseSwaggerDTO[]

    @ApiProperty({ example: 100, description: 'Tổng số bài tập' })
    total: number

    @ApiProperty({ example: 1, description: 'Trang hiện tại' })
    page: number

    @ApiProperty({ example: 10, description: 'Số bài tập mỗi trang' })
    limit: number

    @ApiProperty({ example: 10, description: 'Tổng số trang' })
    totalPages: number
}
