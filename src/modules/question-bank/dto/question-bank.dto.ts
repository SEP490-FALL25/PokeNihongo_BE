import { ApiProperty } from '@nestjs/swagger'
import { QuestionBankStatusEnum } from '../entities/question-bank.entities'

export class QuestionBankSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID của ngân hàng câu hỏi' })
    id: number

    @ApiProperty({ example: 5, description: 'Cấp độ JLPT (1-5)', required: false })
    levelN?: number

    @ApiProperty({ example: 'vocabulary', description: 'Loại đề thi thử JLPT' })
    bankType: string

    @ApiProperty({
        example: QuestionBankStatusEnum.ACTIVE,
        enum: QuestionBankStatusEnum,
        description: 'Trạng thái'
    })
    status: QuestionBankStatusEnum

    @ApiProperty({ example: 1, description: 'ID câu hỏi' })
    questionId: number

    @ApiProperty({ example: 1, description: 'ID người tạo', required: false })
    creatorId?: number

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
    createdAt: Date

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
    updatedAt: Date
}

export class CreateQuestionBankSwaggerDTO {

    @ApiProperty({ example: 5, description: 'Cấp độ JLPT (1-5)', required: false })
    levelN?: number

    @ApiProperty({ example: 'vocabulary', description: 'Loại đề thi thử JLPT (vocabulary, grammar, kanji, listening, etc.)' })
    bankType: string

    @ApiProperty({
        example: QuestionBankStatusEnum.DRAFT,
        enum: QuestionBankStatusEnum,
        description: 'Trạng thái (DRAFT, ACTIVE, INACTIVE)'
    })
    status: QuestionBankStatusEnum

    @ApiProperty({ example: 1, description: 'ID câu hỏi' })
    questionId: number
}

export class UpdateQuestionBankSwaggerDTO {

    @ApiProperty({ example: 5, description: 'Cấp độ JLPT (1-5)', required: false })
    levelN?: number

    @ApiProperty({ example: 'vocabulary', description: 'Loại đề thi thử JLPT', required: false })
    bankType?: string

    @ApiProperty({
        example: QuestionBankStatusEnum.ACTIVE,
        enum: QuestionBankStatusEnum,
        description: 'Trạng thái',
        required: false
    })
    status?: QuestionBankStatusEnum
}

export class QuestionBankResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Status code' })
    statusCode: number

    @ApiProperty({ type: QuestionBankSwaggerDTO, description: 'Dữ liệu ngân hàng câu hỏi' })
    data: QuestionBankSwaggerDTO

    @ApiProperty({ example: 'Lấy thông tin ngân hàng câu hỏi thành công', description: 'Thông báo' })
    message: string
}

export class QuestionBankListResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Status code' })
    statusCode: number

    @ApiProperty({
        description: 'Dữ liệu danh sách ngân hàng câu hỏi',
        properties: {
            results: {
                type: 'array',
                items: { $ref: '#/components/schemas/QuestionBankSwaggerDTO' }
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
        results: QuestionBankSwaggerDTO[]
        pagination: {
            current: number
            pageSize: number
            totalPage: number
            totalItem: number
        }
    }

    @ApiProperty({ example: 'Lấy danh sách ngân hàng câu hỏi thành công', description: 'Thông báo' })
    message: string
}

export class GetQuestionBankListQuerySwaggerDTO {
    @ApiProperty({ example: 1, description: 'Trang hiện tại', required: false })
    currentPage?: number

    @ApiProperty({ example: 10, description: 'Số bản ghi mỗi trang', required: false })
    pageSize?: number

    @ApiProperty({ example: 5, description: 'Cấp độ JLPT', required: false })
    levelN?: number

    @ApiProperty({ example: 'vocabulary', description: 'Loại đề thi thử JLPT', required: false })
    bankType?: string

    @ApiProperty({
        example: QuestionBankStatusEnum.ACTIVE,
        enum: QuestionBankStatusEnum,
        description: 'Trạng thái',
        required: false
    })
    status?: QuestionBankStatusEnum

    @ApiProperty({ example: 'search term', description: 'Tìm kiếm', required: false })
    search?: string
}

