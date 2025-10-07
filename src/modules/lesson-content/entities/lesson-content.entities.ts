import { z } from 'zod'

// Lesson Content Entity Types
export const LessonContentType = z.object({
    id: z.number(),
    lessonId: z.number(),
    contentId: z.number(),
    contentType: z.string(),
    contentOrder: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

export const LessonContentWithRelationsType = LessonContentType.extend({
    lesson: z.object({
        id: z.number(),
        slug: z.string(),
        titleKey: z.string(),
    }).optional(),
})

// Request/Response Types
export const CreateLessonContentBodyType = z.object({
    lessonId: z.number(),
    contentId: z.number(),
    contentType: z.string().min(1).max(50),
    contentOrder: z.number().min(0).default(0),
})

export const UpdateLessonContentBodyType = z.object({
    contentType: z.string().min(1).max(50).optional(),
    contentOrder: z.number().min(0).optional(),
})

export const GetLessonContentByIdParamsType = z.object({
    id: z.string().transform(Number),
})

export const GetLessonContentListQueryType = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    lessonId: z.string().transform(Number).optional(),
    contentType: z.string().optional(),
})

// Type exports
export type LessonContentType = z.infer<typeof LessonContentType>
export type LessonContentWithRelationsType = z.infer<typeof LessonContentWithRelationsType>
export type CreateLessonContentBodyType = z.infer<typeof CreateLessonContentBodyType>
export type UpdateLessonContentBodyType = z.infer<typeof UpdateLessonContentBodyType>
export type GetLessonContentByIdParamsType = z.infer<typeof GetLessonContentByIdParamsType>
export type GetLessonContentListQueryType = z.infer<typeof GetLessonContentListQueryType>
