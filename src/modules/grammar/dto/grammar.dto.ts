import { ApiProperty } from '@nestjs/swagger'
import { GrammarSortField, SortOrder } from '@/common/enum/enum'

export class GrammarResponseSwaggerDTO {
    @ApiProperty({
        example: 1,
        description: 'ID của ngữ pháp'
    })
    id: number

    @ApiProperty({
        example: '〜です',
        description: 'Cấu trúc ngữ pháp'
    })
    structure: string

    @ApiProperty({
        example: 'N5',
        description: 'Cấp độ JLPT (N5, N4, N3, N2, N1)'
    })
    level: string

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

export class GrammarListResponseSwaggerDTO {
    @ApiProperty({
        type: [GrammarResponseSwaggerDTO],
        description: 'Danh sách ngữ pháp'
    })
    items: GrammarResponseSwaggerDTO[]

    @ApiProperty({
        example: 100,
        description: 'Tổng số ngữ pháp'
    })
    total: number

    @ApiProperty({
        example: 1,
        description: 'Trang hiện tại'
    })
    page: number

    @ApiProperty({
        example: 10,
        description: 'Số lượng ngữ pháp mỗi trang'
    })
    limit: number
}

export class CreateGrammarSwaggerDTO {
    @ApiProperty({
        example: '〜です',
        description: 'Cấu trúc ngữ pháp'
    })
    structure: string

    @ApiProperty({
        example: 'N5',
        description: 'Cấp độ JLPT (N5, N4, N3, N2, N1)'
    })
    level: string

    @ApiProperty({
        description: 'Thông tin cách sử dụng ngữ pháp',
        required: false,
        example: {
            exampleSentenceJp: '私は学生です。'
        }
    })
    usage?: {
        exampleSentenceJp: string
    }

    @ApiProperty({
        description: 'Bản dịch cho cách sử dụng ngữ pháp',
        required: false,
        example: {
            usage: [
                {
                    language_code: 'vi',
                    explanation: 'Giải thích cách sử dụng',
                    example: 'Tôi là học sinh.'
                },
                {
                    language_code: 'en',
                    explanation: 'Usage explanation',
                    example: 'I am a student.'
                }
            ]
        }
    })
    translations?: {
        usage?: Array<{ language_code: string; explanation: string; example: string }>
    }
}

export class UpdateGrammarSwaggerDTO {
    @ApiProperty({
        example: '〜です',
        description: 'Cấu trúc ngữ pháp',
        required: false
    })
    structure?: string

    @ApiProperty({
        example: 'N5',
        description: 'Cấp độ JLPT (N5, N4, N3, N2, N1)',
        required: false
    })
    level?: string
}

export class GetGrammarListQuerySwaggerDTO {
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
        description: 'Số lượng ngữ pháp mỗi trang',
        required: false,
        default: 10,
        minimum: 1,
        maximum: 100
    })
    limit?: number

    @ApiProperty({
        example: 'N5',
        description: 'Lọc theo cấp độ JLPT',
        required: false
    })
    level?: string

    @ApiProperty({
        example: 'です',
        description: 'Tìm kiếm theo cấu trúc ngữ pháp',
        required: false
    })
    search?: string

    @ApiProperty({
        enum: GrammarSortField,
        example: GrammarSortField.CREATED_AT,
        description: 'Field để sắp xếp theo structure, level, createdAt, updatedAt',
        required: false
    })
    sortBy?: GrammarSortField

    @ApiProperty({
        enum: SortOrder,
        example: SortOrder.DESC,
        description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
        required: false
    })
    sort?: SortOrder
}
