import { z } from 'zod'
import { LessonContentSortField, SortOrder } from '@/common/enum/enum'
import { LessonContentsType as PrismaLessonContentType } from '@prisma/client'

// Lesson Content Entity Types
export const LessonContentType = z.object({
    id: z.number(),
    lessonId: z.number(),
    contentId: z.number(),
    contentType: z.nativeEnum(PrismaLessonContentType),
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
    contentType: z.nativeEnum(PrismaLessonContentType),
})

export const CreateMutiLessonContentBodyType = z.object({
    lessonId: z.number(),
    contentId: z.number().array(),
    contentType: z.nativeEnum(PrismaLessonContentType),
})

export const UpdateLessonContentBodyType = z.object({
    contentType: z.string().min(1).max(50).optional(),
    contentOrder: z.number().min(0).optional(),
})

export const UpdateLessonContentOrder = z.object({
    contentType: z.nativeEnum(PrismaLessonContentType),
    contentId: z.number().array(),
})

export const GetLessonContentByIdParamsType = z.object({
    id: z.string().transform(Number),
})

export const GetLessonContentListQueryType = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    lessonId: z.string().transform(Number).optional(),
    contentType: z.nativeEnum(PrismaLessonContentType).optional(),
    sortBy: z.nativeEnum(LessonContentSortField).optional().default(LessonContentSortField.CREATED_AT),
    sort: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC),
})

// Response schemas
export const LessonContentListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(LessonContentType),
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
export type LessonContentType = z.infer<typeof LessonContentType>
export type LessonContentWithRelationsType = z.infer<typeof LessonContentWithRelationsType>
export type CreateLessonContentBodyType = z.infer<typeof CreateLessonContentBodyType>
export type CreateMutiLessonContentBodyType = z.infer<typeof CreateMutiLessonContentBodyType>
export type UpdateLessonContentBodyType = z.infer<typeof UpdateLessonContentBodyType>
export type UpdateLessonContentOrder = z.infer<typeof UpdateLessonContentOrder>
export type GetLessonContentByIdParamsType = z.infer<typeof GetLessonContentByIdParamsType>
export type GetLessonContentListQueryType = z.infer<typeof GetLessonContentListQueryType>
export type LessonContentListResType = z.infer<typeof LessonContentListResSchema>

