import { ApiProperty } from '@nestjs/swagger'

// Swagger DTOs for API documentation
export class CreateLanguagesSwaggerDTO {
    @ApiProperty({
        example: 'vi',
        description: 'Mã ngôn ngữ (ISO 639-1/639-2)',
        minLength: 2,
        maxLength: 10
    })
    code: string

    @ApiProperty({
        example: 'Vietnamese',
        description: 'Tên ngôn ngữ',
        minLength: 1,
        maxLength: 100
    })
    name: string
}

export class UpdateLanguagesSwaggerDTO {
    @ApiProperty({
        example: 'vi',
        description: 'Mã ngôn ngữ (ISO 639-1/639-2)',
        required: false,
        minLength: 2,
        maxLength: 10
    })
    code?: string

    @ApiProperty({
        example: 'Vietnamese',
        description: 'Tên ngôn ngữ',
        required: false,
        minLength: 1,
        maxLength: 100
    })
    name?: string
}

export class LanguagesSwaggerResponseDTO {
    @ApiProperty({ example: 1, description: 'ID của ngôn ngữ' })
    id: number

    @ApiProperty({ example: 'vi', description: 'Mã ngôn ngữ' })
    code: string

    @ApiProperty({ example: 'Vietnamese', description: 'Tên ngôn ngữ' })
    name: string

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

export class LanguagesListSwaggerResponseDTO {
    @ApiProperty({ type: [LanguagesSwaggerResponseDTO], description: 'Danh sách ngôn ngữ' })
    data: LanguagesSwaggerResponseDTO[]

    @ApiProperty({ example: 10, description: 'Tổng số ngôn ngữ' })
    total: number

    @ApiProperty({ example: 1, description: 'Trang hiện tại' })
    page: number

    @ApiProperty({ example: 10, description: 'Số ngôn ngữ mỗi trang' })
    limit: number

    @ApiProperty({ example: 1, description: 'Tổng số trang' })
    totalPages: number
}

// Export Zod DTOs
export {
    CreateLanguagesBodyDTO,
    UpdateLanguagesBodyDTO,
    GetLanguagesByIdParamsDTO,
    GetLanguagesListQueryDTO,
    GetLanguagesByCodeParamsDTO,
    LanguagesResponseDTO,
    LanguagesListResponseDTO,
    LanguagesResDTO,
    LanguagesListResDTO
} from './zod/languages-zod.dto'
