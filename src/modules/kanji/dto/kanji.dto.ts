import { ApiProperty } from '@nestjs/swagger'

// Export Zod DTOs from subfolder
export {
    CreateKanjiBodyDTO,
    UpdateKanjiBodyDTO,
    GetKanjiByIdParamsDTO,
    GetKanjiListQueryDTO,
    KanjiResponseDTO,
    KanjiListResponseDTO,
    KanjiResDTO,
    KanjiListResDTO
} from './zod/kanji.zod-dto'

// Swagger DTOs - for API documentation only
export class CreateKanjiSwaggerDTO {
    @ApiProperty({ example: '日', description: 'Ký tự Kanji' })
    character: string

    @ApiProperty({ example: 'kanji.sun.meaning', description: 'Key dịch nghĩa Kanji' })
    meaningKey: string

    @ApiProperty({ example: 8, description: 'Số nét viết', required: false })
    strokeCount?: number

    @ApiProperty({ example: 5, description: 'Cấp độ JLPT (N5-N1)', required: false })
    jlptLevel?: number
}

export class UpdateKanjiSwaggerDTO {
    @ApiProperty({ example: '日', description: 'Ký tự Kanji', required: false })
    character?: string

    @ApiProperty({ example: 'kanji.sun.meaning', description: 'Key dịch nghĩa Kanji', required: false })
    meaningKey?: string

    @ApiProperty({ example: 8, description: 'Số nét viết', required: false })
    strokeCount?: number

    @ApiProperty({ example: 5, description: 'Cấp độ JLPT (N5-N1)', required: false })
    jlptLevel?: number
}

export class KanjiSwaggerResponseDTO {
    @ApiProperty({ example: 1, description: 'ID' })
    id: number

    @ApiProperty({ example: '日', description: 'Ký tự Kanji' })
    character: string

    @ApiProperty({ example: 'kanji.sun.meaning', description: 'Key dịch nghĩa Kanji' })
    meaningKey: string

    @ApiProperty({ example: 8, description: 'Số nét viết' })
    strokeCount: number

    @ApiProperty({ example: 5, description: 'Cấp độ JLPT' })
    jlptLevel: number

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
    createdAt: Date

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
    updatedAt: Date
}

export class KanjiListSwaggerResponseDTO {
    @ApiProperty({ type: [KanjiSwaggerResponseDTO], description: 'Danh sách Kanji' })
    data: KanjiSwaggerResponseDTO[]

    @ApiProperty({ example: 100, description: 'Tổng số Kanji' })
    total: number

    @ApiProperty({ example: 1, description: 'Trang hiện tại' })
    page: number

    @ApiProperty({ example: 10, description: 'Số Kanji mỗi trang' })
    limit: number

    @ApiProperty({ example: 10, description: 'Tổng số trang' })
    totalPages: number
}

