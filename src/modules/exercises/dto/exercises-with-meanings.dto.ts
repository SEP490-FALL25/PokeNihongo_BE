import { ApiProperty } from '@nestjs/swagger'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Custom validation functions
const isValidExerciseType = (exerciseType: string): boolean => {
    const validTypes = ['multiple_choice', 'matching', 'listening', 'speaking']
    return validTypes.includes(exerciseType.toLowerCase())
}

// Meaning schema for exercises with meanings
const MeaningSchema = z.object({
    translations: z
        .record(z.enum(['vi', 'en']), z.string())
        .optional()
        .describe('Translations cho nghĩa này theo ngôn ngữ. Chỉ hỗ trợ: vi (Việt), en (Anh). Ví dụ: { "vi": "nghĩa tiếng Việt", "en": "English meaning" }')
})

// Main schema for creating exercises with meanings
export const CreateExercisesWithMeaningsSchema = z.object({
    titleJp: z
        .string()
        .min(1, 'Tiêu đề bài tập không được để trống')
        .max(200, 'Tiêu đề bài tập quá dài (tối đa 200 ký tự)'),
    exerciseType: z
        .string()
        .min(1, 'Loại bài tập không được để trống')
        .refine(isValidExerciseType, {
            message: 'Loại bài tập phải là multiple_choice, matching, listening, hoặc speaking'
        }),
    content: z
        .string()
        .max(1000, 'Nội dung bài tập quá dài (tối đa 1000 ký tự)')
        .optional(),
    audioUrl: z
        .string()
        .max(500, 'URL âm thanh quá dài (tối đa 500 ký tự)')
        .url('URL âm thanh không hợp lệ')
        .optional(),
    isBlocked: z
        .union([z.boolean(), z.string()])
        .transform((val) => typeof val === 'string' ? val === 'true' : val)
        .optional(),
    price: z
        .union([z.number(), z.string()])
        .transform((val) => typeof val === 'string' ? parseFloat(val) : val)
        .refine((val) => val >= 0, {
            message: 'Giá bài tập phải >= 0'
        })
        .optional(),
    lessonId: z
        .union([z.number(), z.string()])
        .transform((val) => typeof val === 'string' ? parseInt(val) : val)
        .refine((val) => val > 0, {
            message: 'ID bài học phải > 0'
        }),
    meanings: z
        .union([MeaningSchema, z.array(MeaningSchema)])
        .optional()
        .describe('Meaning object hoặc array of meanings. Chỉ lấy meaning đầu tiên để tạo meaningKey chính.')
})

// Response schema
export const ExercisesWithMeaningsResponseSchema = z.object({
    exercises: z.object({
        id: z.number(),
        titleJp: z.string(),
        exerciseType: z.string(),
        titleKey: z.string(),
        content: z.string().nullable(),
        audioUrl: z.string().nullable(),
        isBlocked: z.boolean(),
        price: z.number().nullable(),
        lessonId: z.number(),
        createdAt: z.date(),
        updatedAt: z.date()
    }),
    meanings: z.array(z.object({
        meaningKey: z.string(),
        translations: z.record(z.string(), z.string()).optional()
    }))
})

// Standard response schema
export const ExercisesWithMeaningsResSchema = z
    .object({
        statusCode: z.number(),
        data: ExercisesWithMeaningsResponseSchema,
        message: z.string()
    })
    .strict()

// Swagger DTOs
export class MeaningWithTranslationsSwaggerDTO {
    @ApiProperty({
        example: { "vi": "Bài tập trắc nghiệm", "en": "Multiple choice exercise" },
        description: 'Translations cho nghĩa này theo ngôn ngữ. Chỉ hỗ trợ: vi (Việt), en (Anh)',
        required: false
    })
    translations?: Record<string, string>
}

export class CreateExercisesWithMeaningsSwaggerDTO {
    @ApiProperty({
        example: '文法練習',
        description: 'Tiêu đề bài tập bằng tiếng Nhật'
    })
    titleJp: string

    @ApiProperty({
        example: 'multiple_choice',
        description: 'Loại bài tập',
        enum: ['multiple_choice', 'matching', 'listening', 'speaking']
    })
    exerciseType: string

    @ApiProperty({
        example: 'この練習では文法を学びます',
        description: 'Nội dung mô tả bài tập',
        required: false
    })
    content?: string

    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'File âm thanh của bài tập (MP3, WAV, M4A)',
        required: false
    })
    audioFile?: Express.Multer.File

    @ApiProperty({
        example: 'https://example.com/audio.mp3',
        description: 'URL file âm thanh (nếu không upload file)',
        required: false
    })
    audioUrl?: string

    @ApiProperty({
        example: false,
        description: 'Trạng thái bị chặn',
        required: false
    })
    isBlocked?: boolean

    @ApiProperty({
        example: 0.99,
        description: 'Giá bài tập (nếu có)',
        required: false
    })
    price?: number

    @ApiProperty({
        example: 1,
        description: 'ID bài học'
    })
    lessonId: number

    @ApiProperty({
        type: [MeaningWithTranslationsSwaggerDTO],
        description: 'Danh sách nghĩa của bài tập với translations',
        example: [
            {
                "translations": {
                    "vi": "Bài tập trắc nghiệm",
                    "en": "Multiple choice exercise"
                }
            }
        ],
        required: false
    })
    meanings?: MeaningWithTranslationsSwaggerDTO | MeaningWithTranslationsSwaggerDTO[]
}

class ExercisesWithMeaningsInfoSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID của bài tập' })
    id: number

    @ApiProperty({ example: '文法練習', description: 'Tiêu đề bài tập bằng tiếng Nhật' })
    titleJp: string

    @ApiProperty({ example: 'multiple_choice', description: 'Loại bài tập' })
    exerciseType: string

    @ApiProperty({ example: 'exercise.1.multiple_choice.title', description: 'Key tiêu đề được tự động tạo' })
    titleKey: string

    @ApiProperty({ example: 'この練習では文法を学びます', description: 'Nội dung mô tả bài tập' })
    content: string | null

    @ApiProperty({ example: 'https://example.com/audio.mp3', description: 'URL file âm thanh' })
    audioUrl: string | null

    @ApiProperty({ example: false, description: 'Trạng thái bị chặn' })
    isBlocked: boolean

    @ApiProperty({ example: 0.99, description: 'Giá bài tập' })
    price: number | null

    @ApiProperty({ example: 1, description: 'ID bài học' })
    lessonId: number

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày tạo' })
    createdAt: Date

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Ngày cập nhật' })
    updatedAt: Date
}

class ExercisesMeaningInfoSwaggerDTO {
    @ApiProperty({ example: 'exercise.1.meaning.1', description: 'Key nghĩa được tự động tạo' })
    meaningKey: string

    @ApiProperty({
        example: { "vi": "Bài tập trắc nghiệm", "en": "Multiple choice exercise" },
        description: 'Translations cho nghĩa này theo ngôn ngữ',
        required: false
    })
    translations?: Record<string, string>
}

export class ExercisesWithMeaningsResponseSwaggerDTO {
    @ApiProperty({
        type: ExercisesWithMeaningsInfoSwaggerDTO,
        description: 'Thông tin bài tập đã tạo'
    })
    exercises: ExercisesWithMeaningsInfoSwaggerDTO

    @ApiProperty({
        type: [ExercisesMeaningInfoSwaggerDTO],
        description: 'Danh sách nghĩa đã tạo'
    })
    meanings: ExercisesMeaningInfoSwaggerDTO[]
}

// Type exports
export type CreateExercisesWithMeaningsBodyType = z.infer<typeof CreateExercisesWithMeaningsSchema> & {
    meanings?: any[] | any | string  // Allow array, object, or string for multipart/form-data
    audioFile?: Express.Multer.File  // File upload for multipart/form-data
}
export type ExercisesWithMeaningsResponseType = z.infer<typeof ExercisesWithMeaningsResponseSchema>
export type ExercisesWithMeaningsResType = z.infer<typeof ExercisesWithMeaningsResSchema>
export type MeaningWithTranslationsType = z.infer<typeof MeaningSchema>

// Zod DTOs for NestJS
export const CreateExercisesWithMeaningsBodyDTO = CreateExercisesWithMeaningsSchema
export const ExercisesWithMeaningsResponseDTO = ExercisesWithMeaningsResponseSchema
export const ExercisesWithMeaningsResDTO = ExercisesWithMeaningsResSchema
