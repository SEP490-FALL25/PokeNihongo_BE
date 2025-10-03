import { ApiProperty } from '@nestjs/swagger'
import { z } from 'zod'
import { createZodDto } from 'nestjs-zod'

// Schema cho translation item
const TranslationItemSchema = z.object({
    language_code: z.string().min(2, 'Mã ngôn ngữ phải có ít nhất 2 ký tự'),
    value: z.string().min(1, 'Nội dung dịch không được để trống')
})

// Schema cho example translation
const ExampleTranslationSchema = z.object({
    language_code: z.string().min(2, 'Mã ngôn ngữ phải có ít nhất 2 ký tự'),
    sentence: z.string().min(1, 'Câu dịch không được để trống'),
    original_sentence: z.string().min(1, 'Câu gốc không được để trống')
})

// Schema cho translations object
const TranslationsSchema = z.object({
    meaning: z.array(TranslationItemSchema).min(1, 'Phải có ít nhất 1 nghĩa'),
    examples: z.array(ExampleTranslationSchema).optional()
})

// Main schema (for JSON body)
export const CreateVocabularyFullSchema = z.object({
    word_jp: z.string().min(1, 'Từ tiếng Nhật không được để trống'),
    reading: z.string().min(1, 'Cách đọc không được để trống'),
    level_n: z.number().min(1).max(5).optional(),
    word_type_id: z.number().min(1, 'Word type ID phải lớn hơn 0').optional(),
    audio_url: z.string().url().optional(),
    image_url: z.string().url().optional(),
    translations: TranslationsSchema
})

// Schema for multipart/form-data (translations as string or object)
export const CreateVocabularyFullMultipartSchema = z.object({
    word_jp: z.string().min(1, 'Từ tiếng Nhật không được để trống'),
    reading: z.string().min(1, 'Cách đọc không được để trống'),
    level_n: z.string().transform((val) => parseInt(val, 10)).optional(),
    word_type_id: z.string().transform((val) => parseInt(val, 10)).optional(),
    translations: z.union([
        z.string().transform((val) => JSON.parse(val)), // JSON string → object
        TranslationsSchema // Object trực tiếp
    ])
})

// Zod DTOs
export class CreateVocabularyFullDTO extends createZodDto(CreateVocabularyFullSchema) { }
export class CreateVocabularyFullMultipartDTO extends createZodDto(CreateVocabularyFullMultipartSchema) { }

// Swagger DTOs for documentation
export class TranslationItemSwaggerDTO {
    @ApiProperty({
        example: 'vi',
        description: 'Mã ngôn ngữ (ISO 639-1)'
    })
    language_code: string

    @ApiProperty({
        example: 'Tiếng Nhật',
        description: 'Nội dung dịch'
    })
    value: string
}

export class ExampleTranslationSwaggerDTO {
    @ApiProperty({
        example: 'vi',
        description: 'Mã ngôn ngữ (ISO 639-1)'
    })
    language_code: string

    @ApiProperty({
        example: 'Tôi đang học tiếng Nhật.',
        description: 'Câu dịch'
    })
    sentence: string

    @ApiProperty({
        example: '私は日本語を勉強しています。',
        description: 'Câu gốc tiếng Nhật'
    })
    original_sentence: string
}

export class TranslationsSwaggerDTO {
    @ApiProperty({
        type: [TranslationItemSwaggerDTO],
        description: 'Danh sách nghĩa theo ngôn ngữ'
    })
    meaning: TranslationItemSwaggerDTO[]

    @ApiProperty({
        type: [ExampleTranslationSwaggerDTO],
        description: 'Danh sách ví dụ theo ngôn ngữ',
        required: false
    })
    examples?: ExampleTranslationSwaggerDTO[]
}

export class CreateVocabularyFullSwaggerDTO {
    @ApiProperty({
        example: '日本語',
        description: 'Từ tiếng Nhật'
    })
    word_jp: string

    @ApiProperty({
        example: 'にほんご',
        description: 'Cách đọc (Hiragana)'
    })
    reading: string

    @ApiProperty({
        example: 5,
        description: 'Cấp độ JLPT (N5-N1)',
        required: false
    })
    level_n?: number

    @ApiProperty({
        example: 1,
        description: 'ID của loại từ (noun, verb, etc.)',
        required: false
    })
    word_type_id?: number

    @ApiProperty({
        example: 'https://res.cloudinary.com/audio.mp3',
        description: 'URL file âm thanh',
        required: false
    })
    audio_url?: string

    @ApiProperty({
        example: 'https://res.cloudinary.com/image.jpg',
        description: 'URL hình ảnh',
        required: false
    })
    image_url?: string

    @ApiProperty({
        oneOf: [
            { type: 'string', example: '{"meaning":[{"language_code":"vi","value":"Tiếng Nhật"}],"examples":[]}' },
            { type: 'object', $ref: '#/components/schemas/TranslationsSwaggerDTO' }
        ],
        description: 'Các bản dịch nghĩa và ví dụ (có thể là JSON string hoặc object)'
    })
    translations: string | TranslationsSwaggerDTO
}

// Swagger DTO for multipart/form-data with file uploads
export class CreateVocabularyFullMultipartSwaggerDTO {
    @ApiProperty({
        example: '日本語',
        description: 'Từ tiếng Nhật'
    })
    word_jp: string

    @ApiProperty({
        example: 'にほんご',
        description: 'Cách đọc (Hiragana)'
    })
    reading: string

    @ApiProperty({
        example: '5',
        description: 'Cấp độ JLPT (N5-N1)',
        required: false
    })
    level_n?: string

    @ApiProperty({
        example: '1',
        description: 'ID của loại từ: 1=noun, 2=pronoun, 3=verb, 4=i_adjective, 5=na_adjective, 6=adverb, 7=particle, 8=conjunction',
        required: false,
        enum: ['1', '2', '3', '4', '5', '6', '7', '8']
    })
    word_type_id?: string

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File âm thanh (audio)',
        required: false
    })
    audioFile?: Express.Multer.File

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File hình ảnh (image)',
        required: false
    })
    imageFile?: Express.Multer.File

    @ApiProperty({
        oneOf: [
            { type: 'string', example: '{"meaning":[{"language_code":"vi","value":"Tiếng Nhật"}],"examples":[]}' },
            { type: 'object', $ref: '#/components/schemas/TranslationsSwaggerDTO' }
        ],
        description: 'Các bản dịch nghĩa và ví dụ (có thể là JSON string hoặc object)'
    })
    translations: string | TranslationsSwaggerDTO
}

// Type exports
export type CreateVocabularyFullType = z.infer<typeof CreateVocabularyFullSchema>
export type TranslationItemType = z.infer<typeof TranslationItemSchema>
export type ExampleTranslationType = z.infer<typeof ExampleTranslationSchema>
export type TranslationsType = z.infer<typeof TranslationsSchema>

