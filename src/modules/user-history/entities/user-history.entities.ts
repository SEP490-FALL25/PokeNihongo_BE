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

// Admin History Item Schema (có thêm userId và user info)
export const AdminHistoryItemSchema = HistoryItemSchema.extend({
    userId: z.number().optional(),
    user: z.object({
        id: z.number(),
        email: z.string().optional().nullable()
    }).optional()
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

// Admin History List Response Schema (có thể có user info)
export const AdminHistoryListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(AdminHistoryItemSchema),
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

// Admin History List Query Schema (có thêm userId để filter)
export const GetAdminHistoryListQuerySchema = z
    .object({
        currentPage: z.string().transform((val) => parseInt(val, 10)).optional().default('1'),
        pageSize: z.string().transform((val) => parseInt(val, 10)).optional().default('10'),
        type: HistoryTypeSchema.optional(),
        status: z.string().optional(),
        userId: z.string().transform((val) => parseInt(val, 10)).optional() // Admin có thể filter theo userId
    })
    .strict()

// Recent Lesson Type enum (LESSON hoặc EXERCISE)
export const RecentLessonTypeSchema = z.enum(['LESSON', 'EXERCISE'])

// Recent Lesson Item Schema
export const RecentLessonItemSchema = z.object({
    id: z.number(),
    type: RecentLessonTypeSchema,
    lessonId: z.number().optional().nullable(),
    lessonTitle: z.string().optional().nullable(),
    lessonSlug: z.string().optional().nullable(),
    lessonCategoryName: z.string().optional().nullable(),
    exerciseId: z.number().optional().nullable(),
    exerciseName: z.string().optional().nullable(),
    status: z.string(), // IN_PROGRESS, COMPLETED
    progressPercentage: z.number().optional().nullable(), // 0-100 cho lesson
    lastAccessedAt: z.date().optional().nullable(),
    completedAt: z.date().optional().nullable(),
    updatedAt: z.date()
})

// Recent Lessons Query Schema
export const GetRecentLessonsQuerySchema = z
    .object({
        currentPage: z.string().transform((val) => parseInt(val, 10)).optional().default('1'),
        pageSize: z.string().transform((val) => parseInt(val, 10)).optional().default('10'),
        status: z.enum(['IN_PROGRESS', 'COMPLETED']).optional() // Filter theo status
    })
    .strict()

// Recent Lessons Response Schema
export const RecentLessonsResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(RecentLessonItemSchema),
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
export type HistoryType = z.infer<typeof HistoryTypeSchema>
export type HistoryItemType = z.infer<typeof HistoryItemSchema>
export type AdminHistoryItemType = z.infer<typeof AdminHistoryItemSchema>
export type HistoryListResType = z.infer<typeof HistoryListResSchema>
export type AdminHistoryListResType = z.infer<typeof AdminHistoryListResSchema>
export type GetHistoryListQueryType = z.infer<typeof GetHistoryListQuerySchema>
export type GetAdminHistoryListQueryType = z.infer<typeof GetAdminHistoryListQuerySchema>
export type RecentLessonType = z.infer<typeof RecentLessonTypeSchema>
export type RecentLessonItemType = z.infer<typeof RecentLessonItemSchema>
export type GetRecentLessonsQueryType = z.infer<typeof GetRecentLessonsQuerySchema>
export type RecentLessonsResType = z.infer<typeof RecentLessonsResSchema>

