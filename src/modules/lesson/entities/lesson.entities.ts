import { z } from 'zod'

// Lesson Entity Types
export const LessonType = z.object({
    id: z.number(),
    slug: z.string(),
    titleKey: z.string(),
    levelJlpt: z.number().nullable(),
    estimatedTimeMinutes: z.number(),
    lessonOrder: z.number(),
    isPublished: z.boolean(),
    publishedAt: z.date().nullable(),
    version: z.string(),
    lessonCategoryId: z.number(),
    rewardId: z.number().nullable(),
    createdById: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

export const LessonWithRelationsType = LessonType.extend({
    lessonCategory: z.object({
        id: z.number(),
        nameKey: z.string(),
        slug: z.string(),
    }).optional(),
    reward: z.object({
        id: z.number(),
        name: z.string(),
        rewardType: z.string(),
        rewardItem: z.number(),
        rewardTarget: z.string(),
    }).nullable(),
    createdBy: z.object({
        id: z.number(),
        name: z.string(),
        email: z.string(),
    }).optional(),
})

// Request/Response Types
export const CreateLessonBodyType = z.object({
    slug: z.preprocess(
        (val) => val === '' ? undefined : val,
        z.string().min(1).max(200).optional()
    ),
    titleJp: z.string().min(1).max(500),
    titleKey: z.preprocess(
        (val) => val === '' ? undefined : val,
        z.string().min(1).max(500).optional()
    ),
    levelJlpt: z.number().min(1).max(5).optional(),
    estimatedTimeMinutes: z.number().min(1).max(480).default(30),
    lessonOrder: z.number().min(0).default(0),
    isPublished: z.boolean().default(false),
    version: z.string().default('1.0.0'),
    lessonCategoryId: z.number(),
    rewardId: z.number().optional(),
    translations: z.object({
        meaning: z.array(z.object({
            language_code: z.string(),
            value: z.string()
        }))
    }).optional(),
})

export const UpdateLessonBodyType = CreateLessonBodyType.partial()

export const GetLessonByIdParamsType = z.object({
    id: z.string().transform(Number),
})

export const GetLessonListQueryType = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    search: z.string().optional(),
    lessonCategoryId: z.string().transform(Number).optional(),
    levelJlpt: z.string().transform(Number).optional(),
    isPublished: z.string().transform(Boolean).optional(),
})

// Type exports
export type LessonType = z.infer<typeof LessonType>
export type LessonWithRelationsType = z.infer<typeof LessonWithRelationsType>
export type CreateLessonBodyType = z.infer<typeof CreateLessonBodyType>
export type UpdateLessonBodyType = z.infer<typeof UpdateLessonBodyType>
export type GetLessonByIdParamsType = z.infer<typeof GetLessonByIdParamsType>
export type GetLessonListQueryType = z.infer<typeof GetLessonListQueryType>
