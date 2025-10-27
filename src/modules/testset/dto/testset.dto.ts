import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TestSetStatus, QuestionType } from '@prisma/client'

export class TestSetSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID của bộ đề thi' })
    id: number

    @ApiProperty({ example: 'Đề thi từ vựng N3 - Phần 1', description: 'Tên bộ đề thi' })
    name: string

    @ApiPropertyOptional({ example: 'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi về từ vựng cơ bản trong tiếng Nhật', description: 'Mô tả chi tiết về bộ đề thi' })
    description?: string

    @ApiPropertyOptional({
        example: '２月１４日は、日本ではバレンタインデーです。キリスト教の特別な日ですが、日本では、女の人が好きな人にチョコレートなどのプレゼントをする日になりました。世界にも同じような日があります。ブラジルでは、６月１２日が「恋人の日」と呼ばれる日です。その日は、男の人も女の人もプレゼントを用意して、恋人におくります。 ブラジルでは、日本のようにチョコレートではなく、写真立てに写真を入れて、プレゼントするそうです。',
        description: 'Nội dung bài đọc. Bắt buộc phải có và phải là tiếng Nhật (Hiragana, Katakana, Kanji) khi testType là READING'
    })
    content?: string

    @ApiPropertyOptional({ example: 'https://storage.googleapis.com/pokenihongo-audio/testset-n3-vocab-instruction.mp3', description: 'URL file âm thanh hướng dẫn làm bài' })
    audioUrl?: string

    @ApiPropertyOptional({ example: 50000, description: 'Giá bộ đề thi (VND)' })
    price?: number

    @ApiPropertyOptional({ example: 3, description: 'Cấp độ JLPT (1-5)' })
    levelN?: number

    @ApiProperty({ enum: QuestionType, example: QuestionType.VOCABULARY, description: 'Loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL)' })
    testType: QuestionType

    @ApiProperty({ enum: TestSetStatus, example: TestSetStatus.ACTIVE, description: 'Trạng thái bộ đề thi' })
    status: TestSetStatus

    @ApiPropertyOptional({ example: 1, description: 'ID người tạo bộ đề thi' })
    creatorId?: number

    @ApiProperty({ example: '2024-10-24T14:00:00.000Z', description: 'Thời gian tạo bộ đề thi' })
    createdAt: Date

    @ApiProperty({ example: '2024-10-24T14:30:00.000Z', description: 'Thời gian cập nhật bộ đề thi' })
    updatedAt: Date
}

export class QuestionBankSwaggerDTO {
    @ApiProperty({ example: 101, description: 'ID câu hỏi' })
    id: number

    @ApiPropertyOptional({ example: '学校', description: 'Nội dung câu hỏi tiếng Nhật' })
    questionJp?: string

    @ApiProperty({ example: 'VOCABULARY', description: 'Loại câu hỏi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, WRITING, SPEAKING, GENERAL)' })
    questionType: string

    @ApiPropertyOptional({ example: 'https://storage.googleapis.com/pokenihongo-audio/question-101-gakkou.mp3', description: 'URL file âm thanh của câu hỏi' })
    audioUrl?: string

    @ApiPropertyOptional({ example: 'gakkou', description: 'Phiên âm (romaji)' })
    pronunciation?: string

    @ApiPropertyOptional({ example: 3, description: 'Cấp độ JLPT (1-5)' })
    levelN?: number

    @ApiProperty({ example: 1, description: 'Thứ tự câu hỏi trong bộ đề' })
    questionOrder: number
}

export class TestSetWithQuestionsSwaggerDTO extends TestSetSwaggerDTO {
    @ApiProperty({
        type: [Object],
        description: 'Danh sách câu hỏi trong bộ đề thi',
        example: [
            {
                id: 1,
                questionOrder: 1,
                questionBank: {
                    id: 101,
                    questionJp: '学校',
                    questionType: 'VOCABULARY',
                    audioUrl: 'https://storage.googleapis.com/pokenihongo-audio/question-101-gakkou.mp3',
                    pronunciation: 'gakkou',
                    levelN: 3,
                    questionOrder: 1
                }
            },
            {
                id: 2,
                questionOrder: 2,
                questionBank: {
                    id: 102,
                    questionJp: '先生',
                    questionType: 'VOCABULARY',
                    audioUrl: 'https://storage.googleapis.com/pokenihongo-audio/question-102-sensei.mp3',
                    pronunciation: 'sensei',
                    levelN: 3,
                    questionOrder: 2
                }
            }
        ]
    })
    testSetQuestionBanks: Array<{
        id: number
        questionOrder: number
        questionBank: QuestionBankSwaggerDTO
    }>
}

export class CreateTestSetSwaggerDTO {

    @ApiPropertyOptional({
        example: '２月１４日は、日本ではバレンタインデーです。キリスト教の特別な日ですが、日本では、女の人が好きな人にチョコレートなどのプレゼントをする日になりました。世界にも同じような日があります。ブラジルでは、６月１２日が「恋人の日」と呼ばれる日です。その日は、男の人も女の人もプレゼントを用意して、恋人におくります。 ブラジルでは、日本のようにチョコレートではなく、写真立てに写真を入れて、プレゼントするそうです。',
        description: 'Bài đọc bằng tiếng nhật'
    })
    content?: string | null

    @ApiPropertyOptional({
        example: [
            { field: 'name', language_code: 'vi', value: 'Đề thi từ vựng N3 - Phần 1' },
            { field: 'name', language_code: 'en', value: 'N3 Vocabulary Test - Part 1' },
            { field: 'description', language_code: 'vi', value: 'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi về từ vựng cơ bản' },
            { field: 'description', language_code: 'en', value: 'N3 vocabulary test with 50 basic vocabulary questions' }
        ],
        description: 'Translations cho name và description'
    })
    translations?: Array<{ field: 'name' | 'description'; language_code: string; value: string }>

    @ApiPropertyOptional({
        example: 'https://storage.googleapis.com/pokenihongo-audio/testset-n3-vocab-instruction.mp3',
        description: 'URL file âm thanh hướng dẫn làm bài'
    })
    audioUrl?: string | null

    @ApiPropertyOptional({
        example: 50000,
        description: 'Giá bộ đề thi (VND)'
    })
    price?: number | null

    @ApiPropertyOptional({
        example: 3,
        description: 'Cấp độ JLPT (1-5)'
    })
    levelN?: number | null

    @ApiProperty({
        enum: QuestionType,
        example: QuestionType.VOCABULARY,
        description: 'Loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL)'
    })
    testType: QuestionType

    @ApiPropertyOptional({
        enum: TestSetStatus,
        example: TestSetStatus.DRAFT,
        description: 'Trạng thái bộ đề thi',
        default: TestSetStatus.DRAFT
    })
    status?: TestSetStatus
}

export class UpdateTestSetSwaggerDTO {

    @ApiPropertyOptional({
        example: 'Chọn cấu trúc ngữ pháp đúng để hoàn thành câu. Mỗi câu hỏi có 4 lựa chọn A, B, C, D. (Nội dung đã cập nhật)',
        description: 'Nội dung hướng dẫn làm bài'
    })
    content?: string | null

    @ApiPropertyOptional({
        example: [
            { field: 'name', language_code: 'vi', value: 'Đề thi ngữ pháp N3 - Phần 2 (Cập nhật)' },
            { field: 'name', language_code: 'en', value: 'N3 Grammar Test - Part 2 (Updated)' },
            { field: 'description', language_code: 'vi', value: 'Bộ đề thi ngữ pháp N3 bao gồm 40 câu hỏi về cấu trúc ngữ pháp nâng cao' },
            { field: 'description', language_code: 'en', value: 'N3 grammar test with 40 advanced grammar structure questions' }
        ],
        description: 'Translations cho name và description'
    })
    translations?: Array<{ field: 'name' | 'description'; language_code: string; value: string }>

    @ApiPropertyOptional({
        example: 'https://storage.googleapis.com/pokenihongo-audio/testset-n3-grammar-instruction-updated.mp3',
        description: 'URL file âm thanh hướng dẫn làm bài'
    })
    audioUrl?: string | null

    @ApiPropertyOptional({
        example: 75000,
        description: 'Giá bộ đề thi (VND)'
    })
    price?: number | null

    @ApiPropertyOptional({
        example: 3,
        description: 'Cấp độ JLPT (1-5)'
    })
    levelN?: number | null

    @ApiPropertyOptional({
        enum: QuestionType,
        example: QuestionType.GRAMMAR,
        description: 'Loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL)'
    })
    testType?: QuestionType

    @ApiPropertyOptional({
        enum: TestSetStatus,
        example: TestSetStatus.ACTIVE,
        description: 'Trạng thái bộ đề thi'
    })
    status?: TestSetStatus
}

export class GetTestSetListQuerySwaggerDTO {
    @ApiPropertyOptional({ example: '1', description: 'Trang hiện tại' })
    currentPage?: string

    @ApiPropertyOptional({ example: '10', description: 'Số lượng mỗi trang' })
    pageSize?: string

    @ApiPropertyOptional({ example: 'N3 vocabulary', description: 'Tìm kiếm theo tên hoặc mô tả bộ đề thi' })
    search?: string

    @ApiPropertyOptional({ example: '3', description: 'Lọc theo cấp độ JLPT (1-5)' })
    levelN?: string

    @ApiPropertyOptional({ enum: QuestionType, example: QuestionType.VOCABULARY, description: 'Lọc theo loại đề thi (VOCABULARY, GRAMMAR, KANJI, LISTENING, READING, SPEAKING, GENERAL)' })
    testType?: QuestionType

    @ApiPropertyOptional({ enum: TestSetStatus, example: TestSetStatus.ACTIVE, description: 'Lọc theo trạng thái bộ đề thi' })
    status?: TestSetStatus

    @ApiPropertyOptional({ example: '1', description: 'Lọc theo ID người tạo bộ đề thi' })
    creatorId?: string
}


export class TestSetResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
    statusCode: number

    @ApiProperty({ type: TestSetSwaggerDTO, description: 'Dữ liệu bộ đề thi' })
    data: TestSetSwaggerDTO

    @ApiProperty({ example: 'Lấy thông tin bộ đề thi thành công', description: 'Thông báo kết quả' })
    message: string
}

export class TestSetListResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
    statusCode: number

    @ApiProperty({
        type: Object,
        description: 'Dữ liệu danh sách bộ đề thi',
        example: {
            results: [
                {
                    id: 1,
                    name: 'Đề thi từ vựng N3 - Phần 1',
                    description: 'Bộ đề thi từ vựng N3 bao gồm 50 câu hỏi về từ vựng cơ bản trong tiếng Nhật',
                    testType: 'VOCABULARY',
                    levelN: 3,
                    status: 'ACTIVE',
                    price: 50000
                }
            ],
            pagination: {
                current: 1,
                pageSize: 10,
                totalPage: 5,
                totalItem: 50
            }
        }
    })
    data: {
        results: TestSetSwaggerDTO[]
        pagination: {
            current: number
            pageSize: number
            totalPage: number
            totalItem: number
        }
    }

    @ApiProperty({ example: 'Lấy danh sách bộ đề thi thành công', description: 'Thông báo kết quả' })
    message: string
}

export class TestSetWithQuestionsResponseSwaggerDTO {
    @ApiProperty({ example: 200, description: 'Mã trạng thái HTTP' })
    statusCode: number

    @ApiProperty({ type: TestSetWithQuestionsSwaggerDTO, description: 'Dữ liệu bộ đề thi với danh sách câu hỏi' })
    data: TestSetWithQuestionsSwaggerDTO

    @ApiProperty({ example: 'Lấy thông tin bộ đề thi với câu hỏi thành công', description: 'Thông báo kết quả' })
    message: string
}
