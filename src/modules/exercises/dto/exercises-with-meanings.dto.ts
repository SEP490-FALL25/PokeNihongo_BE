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
const MeaningSchema = z.object({})

// Main schema for creating exercises with meanings
export const CreateExercisesWithMeaningsSchema = z.object({
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
        exerciseType: z.string(),
        content: z.string().nullable(),
        audioUrl: z.string().nullable(),
        isBlocked: z.boolean(),
        price: z.number().nullable(),
        lessonId: z.number(),
        createdAt: z.date(),
        updatedAt: z.date()
    }),
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
    // No translation fields
}

export class CreateExercisesWithMeaningsSwaggerDTO {

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

}

class ExercisesWithMeaningsInfoSwaggerDTO {
    @ApiProperty({ example: 1, description: 'ID của bài tập' })
    id: number


    @ApiProperty({ example: 'multiple_choice', description: 'Loại bài tập' })
    exerciseType: string


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

export class ExercisesWithMeaningsResponseSwaggerDTO {
    @ApiProperty({
        type: ExercisesWithMeaningsInfoSwaggerDTO,
        description: 'Thông tin bài tập đã tạo'
    })
    exercises: ExercisesWithMeaningsInfoSwaggerDTO
}

// Type exports
export type CreateExercisesWithMeaningsBodyType = z.infer<typeof CreateExercisesWithMeaningsSchema> & {
    audioFile?: Express.Multer.File  // File upload for multipart/form-data
}
export type ExercisesWithMeaningsResponseType = z.infer<typeof ExercisesWithMeaningsResponseSchema>
export type ExercisesWithMeaningsResType = z.infer<typeof ExercisesWithMeaningsResSchema>
export type MeaningWithTranslationsType = z.infer<typeof MeaningSchema>

// Zod DTOs for NestJS
export const CreateExercisesWithMeaningsBodyDTO = CreateExercisesWithMeaningsSchema
export const ExercisesWithMeaningsResponseDTO = ExercisesWithMeaningsResponseSchema
export const ExercisesWithMeaningsResDTO = ExercisesWithMeaningsResSchema
