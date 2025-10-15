import { ApiProperty } from '@nestjs/swagger'
import { QuestionSortField, SortOrder } from '@/common/enum/enum'

// Swagger DTOs - for API documentation only
export class TranslationSwaggerDTO {
    @ApiProperty({ example: 'vi', description: 'Mã ngôn ngữ (vi, en, ja)' })
    language_code: string

    @ApiProperty({ example: 'Đây là cái gì?', description: 'Nội dung dịch' })
    value: string
}

export class MeaningSwaggerDTO {
    @ApiProperty({ type: [TranslationSwaggerDTO], description: 'Danh sách bản dịch' })
    meaning: TranslationSwaggerDTO[]
}

export class CreateQuestionSwaggerDTO {
    @ApiProperty({
        example: 'これは何ですか？',
        description: 'Nội dung câu hỏi bằng tiếng Nhật'
    })
    questionJp: string

    @ApiProperty({ example: 1, description: 'ID bài tập' })
    exercisesId: number

    @ApiProperty({
        type: MeaningSwaggerDTO,
        description: 'Bản dịch của câu hỏi (tùy chọn)',
        required: false
    })
    translations?: MeaningSwaggerDTO
}

export class UpdateQuestionSwaggerDTO {
    @ApiProperty({
        example: 'これは何ですか？',
        description: 'Nội dung câu hỏi bằng tiếng Nhật',
        required: false
    })
    questionJp?: string

    @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi trong bài tập', required: false })
    questionOrder?: number

    @ApiProperty({ example: 1, description: 'ID bài tập', required: false })
    exercisesId?: number

    @ApiProperty({
        type: MeaningSwaggerDTO,
        description: 'Bản dịch của câu hỏi (tùy chọn)',
        required: false
    })
    translations?: MeaningSwaggerDTO
}

export class GetQuestionListQuerySwaggerDTO {
    @ApiProperty({ example: 1, description: 'Số trang hiện tại', required: false })
    currentPage?: number

    @ApiProperty({ example: 10, description: 'Số lượng câu hỏi mỗi trang', required: false })
    pageSize?: number

    @ApiProperty({ example: 1, description: 'Lọc theo ID bài tập', required: false })
    exercisesId?: number

    @ApiProperty({ example: '何', description: 'Từ khóa tìm kiếm', required: false })
    search?: string

    @ApiProperty({
        enum: QuestionSortField,
        example: QuestionSortField.CREATED_AT,
        description: 'Field để sắp xếp theo questionJp, questionOrder, questionKey, exercisesId, createdAt, updatedAt',
        required: false
    })
    sortBy?: QuestionSortField

    @ApiProperty({
        enum: SortOrder,
        example: SortOrder.DESC,
        description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
        required: false
    })
    sort?: SortOrder
}

export class QuestionDataSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID' })
    id: number

    @ApiProperty({ example: 'これは何ですか？', description: 'Nội dung câu hỏi bằng tiếng Nhật' })
    questionJp: string

    @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi trong bài tập (tự động tính toán)' })
    questionOrder: number

    @ApiProperty({ example: 'question.1.text', description: 'Key để dịch câu hỏi' })
    questionKey: string

    @ApiProperty({ example: 1, description: 'ID bài tập' })
    exercisesId: number

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
    createdAt: Date

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
    updatedAt: Date

    @ApiProperty({
        type: MeaningSwaggerDTO,
        description: 'Bản dịch của câu hỏi',
        required: false
    })
    translations?: MeaningSwaggerDTO
}

export class QuestionResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
    statusCode: number

    @ApiProperty({ type: QuestionDataSwaggerDTO, description: 'Dữ liệu câu hỏi' })
    data: QuestionDataSwaggerDTO

    @ApiProperty({ example: 'Lấy thông tin câu hỏi thành công', description: 'Thông báo' })
    message: string
}

export class PaginationSwaggerDTO {
    @ApiProperty({ example: 1, description: 'Trang hiện tại' })
    current: number

    @ApiProperty({ example: 10, description: 'Số câu hỏi mỗi trang' })
    pageSize: number

    @ApiProperty({ example: 10, description: 'Tổng số trang' })
    totalPage: number

    @ApiProperty({ example: 100, description: 'Tổng số câu hỏi' })
    totalItem: number
}

export class QuestionListDataSwaggerDTO {
    @ApiProperty({ type: [QuestionDataSwaggerDTO], description: 'Danh sách câu hỏi' })
    results: QuestionDataSwaggerDTO[]

    @ApiProperty({ type: PaginationSwaggerDTO, description: 'Thông tin phân trang' })
    pagination: PaginationSwaggerDTO
}

export class QuestionListResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
    statusCode: number

    @ApiProperty({ type: QuestionListDataSwaggerDTO, description: 'Dữ liệu trả về' })
    data: QuestionListDataSwaggerDTO

    @ApiProperty({ example: 'Lấy danh sách câu hỏi thành công', description: 'Thông báo' })
    message: string
}
