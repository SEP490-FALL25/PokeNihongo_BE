import { ApiProperty } from '@nestjs/swagger'




export class VocabularyResponseSwaggerDTO {
    @ApiProperty({
        example: 1,
        description: 'ID của từ vựng'
    })
    id: number

    @ApiProperty({
        example: 'こんにちは',
        description: 'Từ tiếng Nhật'
    })
    wordJp: string

    @ApiProperty({
        example: 'konnichiwa',
        description: 'Cách đọc từ tiếng Nhật (romaji)'
    })
    reading: string

    @ApiProperty({
        example: 'https://example.com/images/konnichiwa.jpg',
        description: 'URL hình ảnh minh họa từ vựng',
        nullable: true
    })
    imageUrl?: File

    @ApiProperty({
        example: 'https://example.com/audio/konnichiwa.mp3',
        description: 'URL âm thanh phát âm từ vựng',
        nullable: true
    })
    audioUrl?: File

    @ApiProperty({
        example: '2025-01-01T10:00:00.000Z',
        description: 'Thời gian tạo'
    })
    createdAt: Date

    @ApiProperty({
        example: '2025-01-01T10:00:00.000Z',
        description: 'Thời gian cập nhật'
    })
    updatedAt: Date
}

export class VocabularyListResponseSwaggerDTO {
    @ApiProperty({
        type: [VocabularyResponseSwaggerDTO],
        description: 'Danh sách từ vựng'
    })
    items: VocabularyResponseSwaggerDTO[]

    @ApiProperty({
        example: 100,
        description: 'Tổng số từ vựng'
    })
    total: number

    @ApiProperty({
        example: 1,
        description: 'Trang hiện tại'
    })
    page: number

    @ApiProperty({
        example: 10,
        description: 'Số lượng từ vựng mỗi trang'
    })
    limit: number
}

//Get
export class GetVocabularyListQuerySwaggerDTO {
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
        description: 'Số lượng từ vựng mỗi trang',
        required: false,
        default: 10,
        minimum: 1,
        maximum: 100
    })
    limit?: number

    @ApiProperty({
        example: 'こん',
        description: 'Từ khóa tìm kiếm (có thể tìm theo từ tiếng Nhật hoặc cách đọc)',
        required: false,
        maxLength: 100
    })
    search?: string

    @ApiProperty({
        example: 'こんにちは',
        description: 'Tìm kiếm theo từ tiếng Nhật cụ thể',
        required: false,
        maxLength: 500
    })
    wordJp?: string

    @ApiProperty({
        example: 'konnichiwa',
        description: 'Tìm kiếm theo cách đọc cụ thể',
        required: false,
        maxLength: 500
    })
    reading?: string
}

// Multipart DTOs for file uploads
export class CreateVocabularyMultipartSwaggerDTO {
    @ApiProperty({
        example: '日本語',
        description: 'Từ tiếng Nhật (CHỈ chứa Hiragana, Katakana, hoặc Kanji - không cho phép số hoặc ký tự Latin)',
        minLength: 1,
        maxLength: 500
    })
    wordJp: string

    @ApiProperty({
        example: 'にほんご',
        description: 'Cách đọc của từ tiếng Nhật (Hiragana - chỉ chứa ký tự Hiragana và dấu câu cơ bản)',
        minLength: 1,
        maxLength: 500
    })
    reading: string

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Hình ảnh minh họa từ vựng (jpg, png, gif) - tối đa 5MB',
        required: false
    })
    imageUrl?: Express.Multer.File

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File âm thanh của từ vựng (mp3, wav, ogg) - tối đa 10MB. Nếu không có, hệ thống sẽ tự động tạo bằng Text-to-Speech',
        required: false
    })
    audioUrl?: Express.Multer.File
}

export class UpdateVocabularyMultipartSwaggerDTO {
    @ApiProperty({
        example: '日本語',
        description: 'Từ tiếng Nhật (CHỈ chứa Hiragana, Katakana, hoặc Kanji - không cho phép số hoặc ký tự Latin)',
        required: false,
        minLength: 1,
        maxLength: 500
    })
    wordJp?: string

    @ApiProperty({
        example: 'にほんご',
        description: 'Cách đọc của từ tiếng Nhật (Hiragana - chỉ chứa ký tự Hiragana và dấu câu cơ bản)',
        required: false,
        minLength: 1,
        maxLength: 500
    })
    reading?: string

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Hình ảnh minh họa từ vựng (jpg, png, gif) - tối đa 5MB',
        required: false
    })
    imageUrl?: Express.Multer.File

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File âm thanh của từ vựng (mp3, wav, ogg) - tối đa 10MB',
        required: false
    })
    audioUrl?: Express.Multer.File
}

// Advanced Vocabulary Creation DTOs
export class MeaningDTO {
    @ApiProperty({ example: 'vi', description: 'Mã ngôn ngữ' })
    language_code: string

    @ApiProperty({ example: 'Xin chào', description: 'Nghĩa của từ' })
    meaning_text: string
}

