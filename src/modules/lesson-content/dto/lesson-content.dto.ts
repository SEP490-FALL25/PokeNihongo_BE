import { ApiProperty } from '@nestjs/swagger'

export class LessonContentResponseSwaggerDTO {
    @ApiProperty({
        example: 1,
        description: 'ID của nội dung bài học'
    })
    id: number

    @ApiProperty({
        example: 1,
        description: 'ID của bài học'
    })
    lessonId: number

    @ApiProperty({
        example: 1,
        description: 'ID của nội dung (polymorphic)'
    })
    contentId: number

    @ApiProperty({
        example: 'vocabulary',
        description: 'Loại nội dung (vocabulary, grammar, kanji, etc.)'
    })
    contentType: string

    @ApiProperty({
        example: 1,
        description: 'Thứ tự nội dung trong bài học'
    })
    contentOrder: number

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

export class LessonContentListResponseSwaggerDTO {
    @ApiProperty({
        type: [LessonContentResponseSwaggerDTO],
        description: 'Danh sách nội dung bài học'
    })
    items: LessonContentResponseSwaggerDTO[]

    @ApiProperty({
        example: 100,
        description: 'Tổng số nội dung bài học'
    })
    total: number

    @ApiProperty({
        example: 1,
        description: 'Trang hiện tại'
    })
    page: number

    @ApiProperty({
        example: 10,
        description: 'Số lượng nội dung mỗi trang'
    })
    limit: number
}

export class CreateLessonContentSwaggerDTO {
    @ApiProperty({
        example: 1,
        description: 'ID của bài học'
    })
    lessonId: number

    @ApiProperty({
        example: 1,
        description: 'ID của nội dung (polymorphic)'
    })
    contentId: number

    @ApiProperty({
        example: 'vocabulary',
        description: 'Loại nội dung (vocabulary, grammar, kanji, etc.)'
    })
    contentType: string
}

export class UpdateLessonContentSwaggerDTO {
    @ApiProperty({
        example: 'vocabulary',
        description: 'Loại nội dung (vocabulary, grammar, kanji, etc.)',
        required: false
    })
    contentType?: string

    @ApiProperty({
        example: 2,
        description: 'Thứ tự nội dung trong bài học',
        required: false
    })
    contentOrder?: number
}

export class GetLessonContentListQuerySwaggerDTO {
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
        description: 'Số lượng nội dung mỗi trang',
        required: false,
        default: 10,
        minimum: 1,
        maximum: 100
    })
    limit?: number

    @ApiProperty({
        example: 1,
        description: 'ID của bài học',
        required: false
    })
    lessonId?: number

    @ApiProperty({
        example: 'vocabulary',
        description: 'Loại nội dung (vocabulary, grammar, kanji, etc.)',
        required: false
    })
    contentType?: string
}