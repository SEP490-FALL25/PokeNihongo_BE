import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { ExercisesSortField, SortOrder } from '@/common/enum/enum'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Exercises Entity Types
export const ExercisesType = z.object({
    id: z.number(),
    exerciseType: z.string(),
    isBlocked: z.boolean(),
    lessonId: z.number(),
    testSetId: z.number().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

// Request/Response Types
export const CreateExercisesBodyType = z.object({
    exerciseType: z.string().min(1, 'Loại bài tập không được để trống').max(100, 'Loại bài tập không được vượt quá 100 ký tự'),
    isBlocked: z.boolean().default(false),
    lessonId: z.number().min(1, 'ID bài học không hợp lệ'),
    testSetId: z.number().min(1, 'ID bộ đề không hợp lệ').optional(),
})

export const UpdateExercisesBodyType = z.object({
    exerciseType: z.string().min(1, 'Loại bài tập không được để trống').max(100, 'Loại bài tập không được vượt quá 100 ký tự').optional(),
    isBlocked: z.boolean().optional(),
    lessonId: z.number().min(1, 'ID bài học không hợp lệ').optional(),
    testSetId: z.number().min(1, 'ID bộ đề không hợp lệ').optional(),
})

export const GetExercisesByIdParamsType = z.object({
    id: z.string().transform(Number),
})

export const GetExercisesListQueryType = z.object({
    currentPage: z.string().transform(val => val ? Number(val) : 1).default('1'),
    pageSize: z.string().transform(val => val ? Number(val) : 10).default('10'),
    exerciseType: z.string().optional(),
    lessonId: z.string().transform(val => val ? Number(val) : undefined).optional(),
    isBlocked: z.string().transform(val => val === 'true').optional(),
    search: z.string().optional(),
    sortBy: z.nativeEnum(ExercisesSortField).optional().default(ExercisesSortField.CREATED_AT),
    sort: z.preprocess((val) => typeof val === 'string' ? val.toLowerCase() : val, z.nativeEnum(SortOrder)).optional().default(SortOrder.DESC),
})

// Response schemas
export const ExercisesListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(ExercisesType),
            pagination: z.object({
                currentPage: z.number(),
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
