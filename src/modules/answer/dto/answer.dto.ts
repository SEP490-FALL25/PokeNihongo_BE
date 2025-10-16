import { ApiProperty } from '@nestjs/swagger'
import { AnswerSortField, SortOrder } from '@/common/enum/enum'

// Translation DTOs
export class MeaningSwaggerDTO {
    @ApiProperty({
        example: 'vi',
        description: 'Mã ngôn ngữ (vi, en, ja)'
    })
    language_code: string

    @ApiProperty({
        example: 'Đây là quyển sách',
        description: 'Giá trị dịch thuật'
    })
    value: string
}

export class TranslationSwaggerDTO {
    @ApiProperty({
        type: [MeaningSwaggerDTO],
        description: 'Danh sách bản dịch'
    })
    meaning: MeaningSwaggerDTO[]
}

// Swagger DTOs - for API documentation only
export class CreateAnswerSwaggerDTO {
    @ApiProperty({
        example: 'これは本です。',
        description: 'Nội dung câu trả lời bằng tiếng Nhật'
    })
    answerJp: string

    @ApiProperty({
        example: true,
        description: 'Đánh dấu câu trả lời đúng',
        required: false
    })
    isCorrect?: boolean

    @ApiProperty({
        example: 1,
        description: 'ID câu hỏi'
    })
    questionId: number

    @ApiProperty({
        type: TranslationSwaggerDTO,
        description: 'Bản dịch của câu trả lời (tùy chọn)',
        required: false
    })
    translations?: TranslationSwaggerDTO
}

export class UpdateAnswerSwaggerDTO {
    @ApiProperty({
        example: 'これは本です。',
        description: 'Nội dung câu trả lời bằng tiếng Nhật',
        required: false
    })
    answerJp?: string

    @ApiProperty({
        example: true,
        description: 'Đánh dấu câu trả lời đúng',
        required: false
    })
    isCorrect?: boolean

    @ApiProperty({
        example: 1,
        description: 'ID câu hỏi',
        required: false
    })
    questionId?: number

    @ApiProperty({
        type: TranslationSwaggerDTO,
        description: 'Bản dịch của câu trả lời (tùy chọn)',
        required: false
    })
    translations?: TranslationSwaggerDTO
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

    @ApiProperty({ example: '本', description: 'Từ khóa tìm kiếm theo answerJp', required: false })
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

export class AnswerDataSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID' })
    id: number

    @ApiProperty({
        example: 'これは本です。',
        description: 'Nội dung câu trả lời bằng tiếng Nhật'
    })
    answerJp: string

    @ApiProperty({
        example: 'answer.1.text',
        description: 'Key để dịch câu trả lời'
    })
    answerKey: string

    @ApiProperty({
        example: true,
        description: 'Đánh dấu câu trả lời đúng'
    })
    isCorrect: boolean

    @ApiProperty({
        example: 1,
        description: 'ID câu hỏi'
    })
    questionId: number

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Ngày tạo'
    })
    createdAt: Date

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Ngày cập nhật'
    })
    updatedAt: Date

    @ApiProperty({
        type: TranslationSwaggerDTO,
        description: 'Bản dịch của câu trả lời',
        required: false
    })
    translations?: TranslationSwaggerDTO
}

export class AnswerResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'HTTP status code' })
    statusCode: number

    @ApiProperty({
        type: AnswerDataSwaggerDTO,
        description: 'Dữ liệu câu trả lời'
    })
    data: AnswerDataSwaggerDTO

    @ApiProperty({
        example: 'Tạo câu trả lời thành công',
        description: 'Thông báo kết quả'
    })
    message: string
}

// Answer with translation for list (without answerKey)
export class AnswerWithTranslationSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID' })
    id: number

    @ApiProperty({
        example: 'これは本です。',
        description: 'Nội dung câu trả lời bằng tiếng Nhật'
    })
    answerJp: string

    @ApiProperty({
        example: true,
        description: 'Đánh dấu câu trả lời đúng'
    })
    isCorrect: boolean

    @ApiProperty({
        example: 1,
        description: 'ID câu hỏi'
    })
    questionId: number

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Ngày tạo'
    })
    createdAt: Date

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Ngày cập nhật'
    })
    updatedAt: Date

    @ApiProperty({
        example: 'Đây là quyển sách',
        description: 'Bản dịch của câu trả lời (nếu có)',
        required: false
    })
    translatedText?: string
}

export class AnswerPaginationSwaggerDTO {
    @ApiProperty({ example: 1, description: 'Trang hiện tại' })
    current: number

    @ApiProperty({ example: 10, description: 'Số câu trả lời mỗi trang' })
    pageSize: number

    @ApiProperty({ example: 10, description: 'Tổng số trang' })
    totalPage: number

    @ApiProperty({ example: 100, description: 'Tổng số câu trả lời' })
    totalItem: number
}

export class AnswerListDataSwaggerDTO {
    @ApiProperty({
        type: [AnswerWithTranslationSwaggerDTO],
        description: 'Danh sách câu trả lời'
    })
    results: AnswerWithTranslationSwaggerDTO[]

    @ApiProperty({
        type: AnswerPaginationSwaggerDTO,
        description: 'Thông tin phân trang'
    })
    pagination: AnswerPaginationSwaggerDTO
}

export class AnswerListResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'HTTP status code' })
    statusCode: number

    @ApiProperty({
        type: AnswerListDataSwaggerDTO,
        description: 'Dữ liệu danh sách câu trả lời'
    })
    data: AnswerListDataSwaggerDTO

    @ApiProperty({
        example: 'Lấy danh sách câu trả lời thành công',
        description: 'Thông báo kết quả'
    })
    message: string
}
