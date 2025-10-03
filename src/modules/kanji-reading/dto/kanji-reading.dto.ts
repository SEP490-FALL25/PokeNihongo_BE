import { ApiProperty } from '@nestjs/swagger'

// Swagger DTOs for API documentation
export class CreateKanjiReadingSwaggerDTO {
    @ApiProperty({
        example: 1,
        description: 'ID của Kanji',
        minimum: 1
    })
    kanjiId: number

    @ApiProperty({
        example: 'onyomi',
        description: 'Loại cách đọc (onyomi, kunyomi, nanori, irregular)',
        minLength: 1,
        maxLength: 20
    })
    readingType: string

    @ApiProperty({
        example: 'にち',
        description: 'Cách đọc cụ thể',
        minLength: 1,
        maxLength: 100
    })
    reading: string
}

export class UpdateKanjiReadingSwaggerDTO {
    @ApiProperty({
        example: 'onyomi',
        description: 'Loại cách đọc (onyomi, kunyomi, nanori, irregular)',
        minLength: 1,
        maxLength: 20,
        required: false
    })
    readingType?: string

    @ApiProperty({
        example: 'にち',
        description: 'Cách đọc cụ thể',
        minLength: 1,
        maxLength: 100,
        required: false
    })
    reading?: string
}

export class KanjiReadingSwaggerResponseDTO {
    @ApiProperty({ example: 1, description: 'ID của cách đọc' })
    id: number

    @ApiProperty({ example: 1, description: 'ID của Kanji' })
    kanjiId: number

    @ApiProperty({ example: 'onyomi', description: 'Loại cách đọc' })
    readingType: string

    @ApiProperty({ example: 'にち', description: 'Cách đọc' })
    reading: string

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

export class KanjiReadingListSwaggerResponseDTO {
    @ApiProperty({ type: [KanjiReadingSwaggerResponseDTO], description: 'Danh sách cách đọc' })
    data: KanjiReadingSwaggerResponseDTO[]

    @ApiProperty({ example: 10, description: 'Tổng số cách đọc' })
    total: number

    @ApiProperty({ example: 1, description: 'Trang hiện tại' })
    page: number

    @ApiProperty({ example: 10, description: 'Số cách đọc mỗi trang' })
    limit: number

    @ApiProperty({ example: 1, description: 'Tổng số trang' })
    totalPages: number
}

// Export Zod DTOs
export {
    CreateKanjiReadingBodyDTO,
    UpdateKanjiReadingBodyDTO,
    GetKanjiReadingByIdParamsDTO,
    GetKanjiReadingListQueryDTO,
    GetKanjiReadingsByKanjiIdParamsDTO,
    GetKanjiReadingsByTypeParamsDTO,
    KanjiReadingResponseDTO
} from './zod/kanji-reading-zod.dto'
// List Response DTO (not Zod)
export class KanjiReadingListResponseDTO {
    data: any[]
    total: number
    page: number
    limit: number
    totalPages: number
}
