import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// History Type enum
export const HistoryTypeSchema = z.enum(['TEST', 'EXERCISE'])

// History Item Schema
export const HistoryItemSchema = z.object({
    id: z.number(),
    type: HistoryTypeSchema,
    testId: z.number().optional().nullable(),
    testName: z.string().optional().nullable(),
    exerciseId: z.number().optional().nullable(),
    exerciseName: z.string().optional().nullable(),
    status: z.string(),
    score: z.number().optional().nullable(),
    totalQuestions: z.number(),
    correctAnswers: z.number(),
    incorrectAnswers: z.number(),
    time: z.number().optional().nullable(),
    createdAt: z.date(),
    updatedAt: z.date()
})

// History List Response Schema
export const HistoryListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(HistoryItemSchema),
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

// History List Query Schema
export const GetHistoryListQuerySchema = z
    .object({
        currentPage: z.string().transform((val) => parseInt(val, 10)).optional().default('1'),
        pageSize: z.string().transform((val) => parseInt(val, 10)).optional().default('10'),
        type: HistoryTypeSchema.optional(),
        status: z.string().optional()
    })
    .strict()

// Type exports
export type HistoryType = z.infer<typeof HistoryTypeSchema>
export type HistoryItemType = z.infer<typeof HistoryItemSchema>
export type HistoryListResType = z.infer<typeof HistoryListResSchema>
export type GetHistoryListQueryType = z.infer<typeof GetHistoryListQuerySchema>

