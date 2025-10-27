import { ApiProperty } from '@nestjs/swagger'
import { VocabularySortField, VocabularySortOrder } from '@/common/enum/enum'




export class WordTypeResponseSwaggerDTO {
    @ApiProperty({
        example: 1,
        description: 'ID của loại từ'
    })
    id: number

    @ApiProperty({
        example: 'word_type.noun',
        description: 'Key để dịch tên loại từ'
    })
    nameKey: string

    @ApiProperty({
        example: 'Danh từ',
        description: 'Tên loại từ đã được dịch',
        nullable: true
    })
    name?: string
}

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
    imageUrl?: string

    @ApiProperty({
        example: 'https://example.com/audio/konnichiwa.mp3',
        description: 'URL âm thanh phát âm từ vựng',
        nullable: true
    })
    audioUrl?: string

    @ApiProperty({
        example: 5,
        description: 'Cấp độ JLPT (1-5)',
        nullable: true
    })
    levelN?: number

    @ApiProperty({
        type: WordTypeResponseSwaggerDTO,
        description: 'Thông tin loại từ',
        nullable: true
    })
    wordType?: WordTypeResponseSwaggerDTO

    @ApiProperty({
        example: 1,
        description: 'ID người tạo',
        nullable: true
    })
    createdById?: number

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

export class VocabularyPaginationSwaggerDTO {
    @ApiProperty({
        example: 1,
        description: 'Trang hiện tại'
    })
    current: number

    @ApiProperty({
        example: 10,
        description: 'Số lượng từ vựng mỗi trang'
    })
    pageSize: number

    @ApiProperty({
        example: 10,
        description: 'Tổng số trang'
    })
    totalPage: number

    @ApiProperty({
        example: 100,
        description: 'Tổng số từ vựng'
    })
    totalItem: number
}

export class VocabularyListResponseSwaggerDTO {
    @ApiProperty({
        example: 200,
        description: 'Mã trạng thái'
    })
    statusCode: number

    @ApiProperty({
        description: 'Dữ liệu danh sách từ vựng'
    })
    data: {
        results: VocabularyResponseSwaggerDTO[]
        pagination: VocabularyPaginationSwaggerDTO
    }

    @ApiProperty({
        example: 'Lấy danh sách từ vựng thành công',
        description: 'Thông báo'
    })
    message: string
}

export class VocabularyStatisticsSwaggerDTO {
    @ApiProperty({
        example: 100,
        description: 'Tổng số từ vựng'
    })
    totalVocabulary: number

    @ApiProperty({
        example: 50,
        description: 'Tổng số Kanji'
    })
    totalKanji: number

    @ApiProperty({
        example: 20,
        description: 'Số từ vựng cấp độ N5'
    })
    vocabularyN5: number

    @ApiProperty({
        example: 25,
        description: 'Số từ vựng cấp độ N4'
    })
    vocabularyN4: number

    @ApiProperty({
        example: 30,
        description: 'Số từ vựng cấp độ N3'
    })
    vocabularyN3: number

    @ApiProperty({
        example: 15,
        description: 'Số từ vựng cấp độ N2'
    })
    vocabularyN2: number

    @ApiProperty({
        example: 10,
        description: 'Số từ vựng cấp độ N1'
    })
    vocabularyN1: number
}

export class VocabularyStatisticsResponseSwaggerDTO {
    @ApiProperty({
        type: VocabularyStatisticsSwaggerDTO,
        description: 'Thống kê từ vựng'
    })
    data: VocabularyStatisticsSwaggerDTO
}

//Get
export class GetVocabularyListQuerySwaggerDTO {
    @ApiProperty({
        example: 1,
        description: 'Số trang hiện tại',
        required: false,
        default: 1,
        minimum: 1
    })
    currentPage?: number

    @ApiProperty({
        example: 10,
        description: 'Số lượng từ vựng mỗi trang',
        required: false,
        default: 10,
        minimum: 1,
        maximum: 100
    })
    pageSize?: number

    @ApiProperty({
        example: 'こん',
        description: 'Từ khóa tìm kiếm (có thể tìm theo từ tiếng Nhật hoặc cách đọc)',
        required: false,
        maxLength: 100
    })
    search?: string

    @ApiProperty({
        example: 5,
        description: 'Lọc theo cấp độ JLPT (1-5, trong đó 5 là N5, 4 là N4, ..., 1 là N1)',
        required: false,
        minimum: 1,
        maximum: 5
    })
    levelN?: number

    @ApiProperty({
        example: 1,
        description: 'ID của lesson để loại bỏ vocabulary đã có trong lesson đó',
        required: false,
        minimum: 1
    })
    lessonId?: number

    @ApiProperty({
        enum: VocabularySortField,
        example: VocabularySortField.CREATED_AT,
        description: 'Field để sắp xếp theo createdAt, updatedAt, id, levelN',
        required: false,
    })
    sortBy?: VocabularySortField

    @ApiProperty({
        enum: VocabularySortOrder,
        example: VocabularySortOrder.DESC,
        description: 'Sắp xếp theo thứ tự tăng dần (asc) hoặc giảm dần (desc)',
        required: false,
    })
    sort?: VocabularySortOrder


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

// Import DTOs
export class ImportVocabularyXlsxSwaggerDTO {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File Excel với các cột: word, phonetic, mean'
    })
    file: any
}

export class ImportVocabularyTxtSwaggerDTO {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'TXT có các cột: Category\tword\treading\tmeaning\texample_jp\texample_vi'
    })
    file: any
}

