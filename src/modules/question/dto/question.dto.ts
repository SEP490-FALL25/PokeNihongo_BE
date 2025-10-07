import { ApiProperty } from '@nestjs/swagger'

// Swagger DTOs - for API documentation only
export class CreateQuestionSwaggerDTO {
    @ApiProperty({ example: 'これは何ですか？', description: 'Nội dung câu hỏi bằng tiếng Nhật' })
    questionJp: string

    @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi trong bài tập', required: false })
    questionOrder?: number

    @ApiProperty({ example: 1, description: 'ID bài tập' })
    exercisesId: number
}

export class UpdateQuestionSwaggerDTO {
    @ApiProperty({ example: 'これは何ですか？', description: 'Nội dung câu hỏi bằng tiếng Nhật', required: false })
    questionJp?: string

    @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi trong bài tập', required: false })
    questionOrder?: number

    @ApiProperty({ example: 1, description: 'ID bài tập', required: false })
    exercisesId?: number
}

export class GetQuestionListQuerySwaggerDTO {
    @ApiProperty({ example: 1, description: 'Số trang', required: false })
    page?: number

    @ApiProperty({ example: 10, description: 'Số lượng câu hỏi mỗi trang', required: false })
    limit?: number

    @ApiProperty({ example: 1, description: 'Lọc theo ID bài tập', required: false })
    exercisesId?: number

    @ApiProperty({ example: '何', description: 'Từ khóa tìm kiếm', required: false })
    search?: string
}

export class QuestionResponseSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID' })
    id: number

    @ApiProperty({ example: 'これは何ですか？', description: 'Nội dung câu hỏi bằng tiếng Nhật' })
    questionJp: string

    @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi trong bài tập' })
    questionOrder: number

    @ApiProperty({ example: 'question.what.is.this', description: 'Key để dịch câu hỏi' })
    questionKey: string

    @ApiProperty({ example: 1, description: 'ID bài tập' })
    exercisesId: number

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
    createdAt: Date

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
    updatedAt: Date
}

export class QuestionListResponseSwaggerDTO {
    @ApiProperty({ type: [QuestionResponseSwaggerDTO], description: 'Danh sách câu hỏi' })
    data: QuestionResponseSwaggerDTO[]

    @ApiProperty({ example: 100, description: 'Tổng số câu hỏi' })
    total: number

    @ApiProperty({ example: 1, description: 'Trang hiện tại' })
    page: number

    @ApiProperty({ example: 10, description: 'Số câu hỏi mỗi trang' })
    limit: number

    @ApiProperty({ example: 10, description: 'Tổng số trang' })
    totalPages: number
}
