import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Exercises Entity Types
export const ExercisesType = z.object({
    id: z.number(),
    exerciseType: z.string(),
    content: z.string().nullable(),
    audioUrl: z.string().nullable(),
    isBlocked: z.boolean(),
    price: z.number().nullable(),
    lessonId: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

// Request/Response Types
export const CreateExercisesBodyType = z.object({
    exerciseType: z.string().min(1, 'Loại bài tập không được để trống').max(100, 'Loại bài tập không được vượt quá 100 ký tự'),
    content: z.string().max(5000, 'Nội dung không được vượt quá 5000 ký tự').optional(),
    audioUrl: z.string().url('URL âm thanh không hợp lệ').max(1000, 'URL âm thanh không được vượt quá 1000 ký tự').optional(),
    isBlocked: z.boolean().default(false),
    price: z.number().min(0, 'Giá không được âm').max(999999.99, 'Giá quá lớn').optional(),
    lessonId: z.number().min(1, 'ID bài học không hợp lệ'),
})

export const UpdateExercisesBodyType = z.object({
    exerciseType: z.string().min(1, 'Loại bài tập không được để trống').max(100, 'Loại bài tập không được vượt quá 100 ký tự').optional(),
    content: z.string().max(5000, 'Nội dung không được vượt quá 5000 ký tự').optional(),
    audioUrl: z.string().url('URL âm thanh không hợp lệ').max(1000, 'URL âm thanh không được vượt quá 1000 ký tự').optional(),
    isBlocked: z.boolean().optional(),
    price: z.number().min(0, 'Giá không được âm').max(999999.99, 'Giá quá lớn').optional(),
    lessonId: z.number().min(1, 'ID bài học không hợp lệ').optional(),
})

export const GetExercisesByIdParamsType = z.object({
    id: z.string().transform(Number),
})

export const GetExercisesListQueryType = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    exerciseType: z.string().optional(),
    lessonId: z.string().transform(Number).optional(),
    isBlocked: z.string().transform(val => val === 'true').optional(),
    search: z.string().optional(),
})

// Response schemas
export const ExercisesListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(ExercisesType),
            pagination: z.object({
                current: z.number(),
                pageSize: z.number(),
                totalPage: z.number(),
                totalItem: z.number()
            })
        }),
        message: z.string()
    })
    .strict()

// Type exports
export type ExercisesType = z.infer<typeof ExercisesType>
export type CreateExercisesBodyType = z.infer<typeof CreateExercisesBodyType>
export type UpdateExercisesBodyType = z.infer<typeof UpdateExercisesBodyType>
export type GetExercisesByIdParamsType = z.infer<typeof GetExercisesByIdParamsType>
export type GetExercisesListQueryType = z.infer<typeof GetExercisesListQueryType>
export type ExercisesListResType = z.infer<typeof ExercisesListResSchema>
