import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// ExerciseAttemptStatus enum
export const ExerciseAttemptStatusSchema = z.enum(['IN_PROGRESS', 'COMPLETED', 'ABANDONED'])

// UserExerciseAttempt schema
export const UserExerciseAttemptSchema = z.object({
    id: z.number(),
    userId: z.number(),
    exerciseId: z.number(),
    status: ExerciseAttemptStatusSchema,
    createdAt: z.date(),
    updatedAt: z.date()
})

export const CreateUserExerciseAttemptBodySchema = z.object({}).strict()

export const UpdateUserExerciseAttemptBodySchema = UserExerciseAttemptSchema.pick({
    status: true
}).partial().strict()

export const UserExerciseAttemptResSchema = z
    .object({
        statusCode: z.number(),
        data: UserExerciseAttemptSchema,
        message: z.string()
    })
    .strict()

export const UserExerciseAttemptListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(UserExerciseAttemptSchema),
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

export const GetUserExerciseAttemptByIdParamsSchema = z
    .object({
        id: z.string().transform((val) => parseInt(val, 10))
    })
    .strict()

export const CreateUserExerciseAttemptParamsSchema = z
    .object({
        exerciseId: z.string().transform((val) => parseInt(val, 10))
    })
    .strict()

export const GetUserExerciseAttemptListQuerySchema = z
    .object({
        currentPage: z.string().transform((val) => parseInt(val, 10)).optional().default('1'),
        pageSize: z.string().transform((val) => parseInt(val, 10)).optional().default('10'),
        userId: z.string().transform((val) => parseInt(val, 10)).optional(),
        exerciseId: z.string().transform((val) => parseInt(val, 10)).optional(),
        status: ExerciseAttemptStatusSchema.optional()
    })
    .strict()

// Types
export type ExerciseAttemptStatusType = z.infer<typeof ExerciseAttemptStatusSchema>
export type UserExerciseAttemptType = z.infer<typeof UserExerciseAttemptSchema>
export type CreateUserExerciseAttemptBodyType = z.infer<typeof CreateUserExerciseAttemptBodySchema>
export type UpdateUserExerciseAttemptBodyType = z.infer<typeof UpdateUserExerciseAttemptBodySchema>
export type UserExerciseAttemptResType = z.infer<typeof UserExerciseAttemptResSchema>
export type UserExerciseAttemptListResType = z.infer<typeof UserExerciseAttemptListResSchema>
export type GetUserExerciseAttemptByIdParamsType = z.infer<typeof GetUserExerciseAttemptByIdParamsSchema>
export type CreateUserExerciseAttemptParamsType = z.infer<typeof CreateUserExerciseAttemptParamsSchema>
export type GetUserExerciseAttemptListQueryType = z.infer<typeof GetUserExerciseAttemptListQuerySchema>


