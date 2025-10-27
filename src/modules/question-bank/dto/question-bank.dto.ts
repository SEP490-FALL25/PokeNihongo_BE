import { ApiProperty } from '@nestjs/swagger'
import { QuestionBankStatusEnum, QuestionType } from '@/common/enum/enum'

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

export class CreateQuestionBankWithMeaningsSwaggerDTO {
    @ApiProperty({
        example: 'あなたの名前は何ですか？',
        description: 'Câu hỏi bằng tiếng Nhật. Nếu type là LISTENING, hệ thống sẽ tự động chuyển thành text-to-speech'
    })
    questionJp: string

    @ApiProperty({
        example: 'VOCABULARY',
        enum: ['VOCABULARY', 'GRAMMAR', 'KANJI', 'LISTENING', 'READING', 'SPEAKING'],
        description: 'Loại câu hỏi: VOCABULARY (từ vựng), GRAMMAR (ngữ pháp), KANJI (hán tự), LISTENING (nghe hiểu), READING (đọc hiểu), SPEAKING (nói)'
    })
    questionType: string

    @ApiProperty({
        example: 'https://example.com/audio.mp3',
        description: 'URL file âm thanh. Optional - chỉ khi questionType là LISTENING và không truyền thì hệ thống sẽ tự động gen text-to-speech từ questionJp',
        required: false
    })
    audioUrl?: string

    @ApiProperty({
        example: 'anata no namae wa nan desu ka',
        description: 'Cách phát âm romaji. Có thể null, nhưng BẮT BUỘC phải có nếu type là SPEAKING',
        required: false
    })
    pronunciation?: string

    @ApiProperty({ example: 3, description: 'Cấp độ JLPT (1-5)', required: false })
    levelN?: number

    @ApiProperty({
        type: [Object],
        description: 'Danh sách nghĩa của câu hỏi với translations',
        example: [
            {
                "translations": {
                    "vi": "Tên bạn là gì?",
                    "en": "What is your name?"
                }
            }
        ]
    })
    meanings?: Array<{
        meaningKey: string
        translations: Record<string, string>
    }>
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

    @ApiProperty({
        example: QuestionType.VOCABULARY,
        enum: QuestionType,
        description: 'Loại câu hỏi: VOCABULARY (từ vựng), GRAMMAR (ngữ pháp), KANJI (hán tự), LISTENING (nghe hiểu), READING (đọc hiểu), SPEAKING (nói)',
        required: false
    })
    questionType?: string

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

export class AnswerSwaggerDTO {
    @ApiProperty({ example: '田中太郎です', description: 'Câu trả lời bằng tiếng Nhật' })
    answerJp: string

    @ApiProperty({ example: true, description: 'Có phải câu trả lời đúng không' })
    isCorrect: boolean

    @ApiProperty({
        example: {
            meaning: [
                { language_code: 'vi', value: 'Tôi là Tanaka Taro' },
                { language_code: 'en', value: 'I am Tanaka Taro' }
            ]
        },
        description: 'Bản dịch của câu trả lời',
        required: false
    })
    translations?: {
        meaning: Array<{
            language_code: string
            value: string
        }>
    } | {
        language_code: string
        value: string
    }
}

export class CreateQuestionBankWithAnswersSwaggerDTO {
    @ApiProperty({
        example: 'あなたの名前は何ですか？',
        description: 'Câu hỏi bằng tiếng Nhật. Nếu type là LISTENING, hệ thống sẽ tự động chuyển thành text-to-speech'
    })
    questionJp: string

    @ApiProperty({
        example: 'VOCABULARY',
        enum: ['VOCABULARY', 'GRAMMAR', 'KANJI', 'LISTENING', 'READING', 'SPEAKING', 'MATCHING'],
        description: 'Loại câu hỏi: VOCABULARY (từ vựng), GRAMMAR (ngữ pháp), KANJI (hán tự), LISTENING (nghe hiểu), READING (đọc hiểu), SPEAKING (nói), MATCHING (ghép cặp)'
    })
    questionType: string

    @ApiProperty({
        example: 'https://example.com/audio.mp3',
        description: 'URL file âm thanh. Optional - chỉ khi questionType là LISTENING và không truyền thì hệ thống sẽ tự động gen text-to-speech từ questionJp',
        required: false
    })
    audioUrl?: string


    @ApiProperty({
        example: 'anata no namae wa nan desu ka',
        description: 'Cách phát âm romaji. Bắt buộc khi questionType là SPEAKING',
        required: false
    })
    pronunciation?: string

    @ApiProperty({
        example: 3,
        description: 'Cấp độ JLPT (1-5)',
        required: false
    })
    levelN?: number

    @ApiProperty({
        description: 'Danh sách nghĩa và bản dịch của câu hỏi',
        type: [Object],
        required: false,
        example: [
            {
                translations: {
                    vi: 'Tên bạn là gì?',
                    en: 'What is your name?'
                }
            }
        ]
    })
    meanings?: Array<{
        meaningKey?: string
        translations: Record<string, string>
    }>

    @ApiProperty({
        description: 'Danh sách câu trả lời (1-4 câu)',
        type: [AnswerSwaggerDTO],
        minItems: 1,
        maxItems: 4,
        example: [
            {
                answerJp: '田中太郎です',
                isCorrect: true,
                translations: {
                    meaning: [
                        { language_code: 'vi', value: 'Tôi là Tanaka Taro' }
                    ]
                }
            },
            {
                answerJp: '佐藤花子です',
                isCorrect: false,
                translations: {
                    meaning: [
                        { language_code: 'vi', value: 'Tôi là Sato Hanako' }
                    ]
                }
            }
        ]
    })
    answers: AnswerSwaggerDTO[]
}

export class CreateQuestionBankWithAnswersResponseSwaggerDTO {
    @ApiProperty({ example: 201, description: 'Status code' })
    statusCode: number

    @ApiProperty({
        description: 'Dữ liệu câu hỏi và câu trả lời đã tạo',
        type: 'object',
        properties: {
            questionBank: { type: 'object', additionalProperties: true },
            answers: {
                type: 'array',
                items: { type: 'object', additionalProperties: true }
            },
            createdCount: { type: 'number', example: 4 },
            failedCount: { type: 'number', example: 0 }
        },
        additionalProperties: true
    })
    data: {
        questionBank: QuestionBankSwaggerDTO
        answers: AnswerSwaggerDTO[]
        createdCount: number
        failedCount: number
    }

    @ApiProperty({ example: 'Tạo câu hỏi và câu trả lời thành công', description: 'Thông báo' })
    message: string
}

