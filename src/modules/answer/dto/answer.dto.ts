import { ApiProperty } from '@nestjs/swagger'
import { AnswerSortField, SortOrder } from '@/common/enum/enum'

// Swagger DTOs - for API documentation only
export class CreateAnswerSwaggerDTO {
    @ApiProperty({ example: 'これは本です。', description: 'Nội dung câu trả lời bằng tiếng Nhật' })
    answerJp: string

    @ApiProperty({ example: true, description: 'Đánh dấu câu trả lời đúng', required: false })
    isCorrect?: boolean

    @ApiProperty({ example: 1, description: 'ID câu hỏi' })
    questionId: number
}

export class UpdateAnswerSwaggerDTO {
    @ApiProperty({ example: 'これは本です。', description: 'Nội dung câu trả lời bằng tiếng Nhật', required: false })
    answerJp?: string

    @ApiProperty({ example: true, description: 'Đánh dấu câu trả lời đúng', required: false })
    isCorrect?: boolean

    @ApiProperty({ example: 1, description: 'ID câu hỏi', required: false })
    questionId?: number
}

export class GetAnswerListQuerySwaggerDTO {
    @ApiProperty({ example: 1, description: 'Số trang hiện tại', required: false })
    currentPage?: number

    @ApiProperty({ example: 10, description: 'Số lượng câu trả lời mỗi trang', required: false })
    pageSize?: number

    @ApiProperty({ example: 1, description: 'Lọc theo ID câu hỏi', required: false })
    questionId?: number

    @ApiProperty({ example: true, description: 'Lọc theo câu trả lời đúng', required: false })
    isCorrect?: boolean

    @ApiProperty({ example: '本', description: 'Từ khóa tìm kiếm', required: false })
    search?: string

    @ApiProperty({
        enum: AnswerSortField,
        example: AnswerSortField.CREATED_AT,
        description: 'Field để sắp xếp theo answerJp, answerKey, isCorrect, questionId, createdAt, updatedAt',
        required: false
    })
    sortBy?: AnswerSortField

    @ApiProperty({
        enum: SortOrder,
        example: SortOrder.DESC,
        description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
        required: false
    })
    sort?: SortOrder
}

export class AnswerResponseSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID' })
    id: number

    @ApiProperty({ example: 'これは本です。', description: 'Nội dung câu trả lời bằng tiếng Nhật' })
    answerJp: string

    @ApiProperty({ example: 'answer.this.is.book', description: 'Key để dịch câu trả lời' })
    answerKey: string

    @ApiProperty({ example: true, description: 'Đánh dấu câu trả lời đúng' })
    isCorrect: boolean

    @ApiProperty({ example: 1, description: 'ID câu hỏi' })
    questionId: number

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
    createdAt: Date

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
    updatedAt: Date
}

export class AnswerListResponseSwaggerDTO {
    @ApiProperty({ type: [AnswerResponseSwaggerDTO], description: 'Danh sách câu trả lời' })
    data: AnswerResponseSwaggerDTO[]

    @ApiProperty({ example: 100, description: 'Tổng số câu trả lời' })
    total: number

    @ApiProperty({ example: 1, description: 'Trang hiện tại' })
    page: number

    @ApiProperty({ example: 10, description: 'Số câu trả lời mỗi trang' })
    limit: number

    @ApiProperty({ example: 10, description: 'Tổng số trang' })
    totalPages: number
}
