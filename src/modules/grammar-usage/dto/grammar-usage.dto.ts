import { ApiProperty } from '@nestjs/swagger'

export class GrammarUsageResponseSwaggerDTO {
    @ApiProperty({
        example: 1,
        description: 'ID của cách sử dụng ngữ pháp'
    })
    id: number

    @ApiProperty({
        example: 1,
        description: 'ID của ngữ pháp'
    })
    grammarId: number

    @ApiProperty({
        example: 'grammar.1.usage.1.explanation',
        description: 'Key giải thích cách sử dụng'
    })
    explanationKey: string

    @ApiProperty({
        example: '私は学生です。',
        description: 'Câu ví dụ bằng tiếng Nhật'
    })
    exampleSentenceJp: string

    @ApiProperty({
        example: 'grammar.1.usage.1.example',
        description: 'Key câu ví dụ'
    })
    exampleSentenceKey: string

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Thời gian tạo'
    })
    createdAt: Date

    @ApiProperty({
        example: '2024-01-01T00:00:00.000Z',
        description: 'Thời gian cập nhật'
    })
    updatedAt: Date
}

export class GrammarUsageWithGrammarResponseSwaggerDTO extends GrammarUsageResponseSwaggerDTO {
    @ApiProperty({
        description: 'Thông tin ngữ pháp liên quan',
        example: {
            id: 1,
            structure: '〜です',
            level: 'N5'
        }
    })
    grammar?: {
        id: number
        structure: string
        level: string
    }
}

export class GrammarUsageListResponseSwaggerDTO {
    @ApiProperty({
        type: [GrammarUsageResponseSwaggerDTO],
        description: 'Danh sách cách sử dụng ngữ pháp'
    })
    items: GrammarUsageResponseSwaggerDTO[]

    @ApiProperty({
        example: 100,
        description: 'Tổng số cách sử dụng ngữ pháp'
    })
    total: number

    @ApiProperty({
        example: 1,
        description: 'Trang hiện tại'
    })
    page: number

    @ApiProperty({
        example: 10,
        description: 'Số lượng cách sử dụng mỗi trang'
    })
    limit: number
}

export class CreateGrammarUsageSwaggerDTO {
    @ApiProperty({
        example: 1,
        description: 'ID của ngữ pháp'
    })
    grammarId: number

    @ApiProperty({
        example: 'grammar.1.usage.1.explanation',
        description: 'Key giải thích cách sử dụng'
    })
    explanationKey: string

    @ApiProperty({
        example: '私は学生です。',
        description: 'Câu ví dụ bằng tiếng Nhật'
    })
    exampleSentenceJp: string

    @ApiProperty({
        example: 'grammar.1.usage.1.example',
        description: 'Key câu ví dụ'
    })
    exampleSentenceKey: string
}

export class UpdateGrammarUsageSwaggerDTO {
    @ApiProperty({
        example: 'grammar.1.usage.1.explanation',
        description: 'Key giải thích cách sử dụng',
        required: false
    })
    explanationKey?: string

    @ApiProperty({
        example: '私は学生です。',
        description: 'Câu ví dụ bằng tiếng Nhật',
        required: false
    })
    exampleSentenceJp?: string

    @ApiProperty({
        example: 'grammar.1.usage.1.example',
        description: 'Key câu ví dụ',
        required: false
    })
    exampleSentenceKey?: string
}

export class GetGrammarUsageListQuerySwaggerDTO {
    @ApiProperty({
        example: 1,
        description: 'Số trang',
        required: false,
        default: 1,
        minimum: 1
    })
    page?: number

    @ApiProperty({
        example: 10,
        description: 'Số lượng cách sử dụng mỗi trang',
        required: false,
        default: 10,
        minimum: 1,
        maximum: 100
    })
    limit?: number

    @ApiProperty({
        example: 1,
        description: 'Lọc theo ID ngữ pháp',
        required: false
    })
    grammarId?: number
}
