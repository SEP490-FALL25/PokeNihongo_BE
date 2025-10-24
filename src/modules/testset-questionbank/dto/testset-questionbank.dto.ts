import { ApiProperty } from '@nestjs/swagger'
import { QuestionType } from '@prisma/client'

// Swagger DTOs - for API documentation only
export class TestSetQuestionBankSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID của TestSetQuestionBank' })
    id: number

    @ApiProperty({ example: 1, description: 'ID của TestSet' })
    testSetId: number

    @ApiProperty({ example: 1, description: 'ID của QuestionBank' })
    questionBankId: number

    @ApiProperty({
        enum: QuestionType,
        example: QuestionType.VOCABULARY,
        description: 'Loại câu hỏi'
    })
    questionType: QuestionType

    @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi trong bộ đề' })
    questionOrder: number

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Thời gian tạo' })
    createdAt: Date

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Thời gian cập nhật' })
    updatedAt: Date
}

export class CreateTestSetQuestionBankSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID của TestSet' })
    testSetId: number

    @ApiProperty({ example: 1, description: 'ID của QuestionBank' })
    questionBankId: number

    @ApiProperty({
        enum: QuestionType,
        example: QuestionType.VOCABULARY,
        description: 'Loại câu hỏi',
        default: QuestionType.VOCABULARY
    })
    questionType?: QuestionType

    @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi trong bộ đề', default: 0 })
    questionOrder?: number
}

export class UpdateTestSetQuestionBankSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID của TestSet', required: false })
    testSetId?: number

    @ApiProperty({ example: 1, description: 'ID của QuestionBank', required: false })
    questionBankId?: number

    @ApiProperty({
        enum: QuestionType,
        example: QuestionType.VOCABULARY,
        description: 'Loại câu hỏi',
        required: false
    })
    questionType?: QuestionType

    @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi trong bộ đề', required: false })
    questionOrder?: number
}

export class UpdateQuestionOrderSwaggerDTO {
    @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi mới trong bộ đề' })
    questionOrder: number
}

export class TestSetQuestionBankResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
    statusCode: number

    @ApiProperty({
        type: TestSetQuestionBankSwaggerDTO,
        description: 'Dữ liệu TestSetQuestionBank'
    })
    data: TestSetQuestionBankSwaggerDTO

    @ApiProperty({ example: 'Thao tác thành công', description: 'Thông báo kết quả' })
    message: string
}

export class TestSetQuestionBankListResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
    statusCode: number

    @ApiProperty({
        type: [TestSetQuestionBankSwaggerDTO],
        description: 'Danh sách TestSetQuestionBank'
    })
    data: TestSetQuestionBankSwaggerDTO[]

    @ApiProperty({ example: 'Lấy danh sách thành công', description: 'Thông báo kết quả' })
    message: string
}
