import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { AnswerSortField, SortOrder } from '@/common/enum/enum'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Answer Entity Types
export const AnswerType = z.object({
    id: z.number(),
    answerJp: z.string(),
    answerKey: z.string(),
    isCorrect: z.boolean(),
    questionId: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

// Answer with translation for list (without answerKey)
export const AnswerWithTranslationType = AnswerType.omit({ answerKey: true }).extend({
    translatedText: z.string().optional()
})

// Request/Response Types
export const CreateAnswerBodyType = z.object({
    answerJp: z.string().min(1, 'Nội dung câu trả lời không được để trống').max(1000, 'Nội dung câu trả lời không được vượt quá 1000 ký tự'),
    isCorrect: z.boolean().default(false),
    questionId: z.number().min(1, 'ID câu hỏi không hợp lệ'),
    translations: z.union([
        // Format 1: Simple object with language_code and value
        z.object({
            language_code: z.string(),
            value: z.string()
        }),
        // Format 2: Complex object with meaning array
        z.object({
            meaning: z.array(z.object({
                language_code: z.string(),
                value: z.string()
            }))
        })
    ]).optional(),
})

export const UpdateAnswerBodyType = z.object({
    answerJp: z.string().min(1, 'Nội dung câu trả lời không được để trống').max(1000, 'Nội dung câu trả lời không được vượt quá 1000 ký tự').optional(),
    isCorrect: z.boolean().optional(),
    questionId: z.number().min(1, 'ID câu hỏi không hợp lệ').optional(),
    translations: z.union([
        // Format 1: Simple object with language_code and value
        z.object({
            language_code: z.string(),
            value: z.string()
        }),
        // Format 2: Complex object with meaning array
        z.object({
            meaning: z.array(z.object({
                language_code: z.string(),
                value: z.string()
            }))
        })
    ]).optional(),
})

export const GetAnswerByIdParamsType = z.object({
    id: z.string().transform(Number),
})

export const GetAnswerListQueryType = z.object({
    currentPage: z.string().transform(Number).default('1'),
    pageSize: z.string().transform(Number).default('10'),
    questionId: z.string().transform(Number).optional(),
    isCorrect: z.string().transform(val => val === 'true').optional(),
    search: z.string().optional(),
    sortBy: z.nativeEnum(AnswerSortField).optional().default(AnswerSortField.CREATED_AT),
    sort: z.nativeEnum(SortOrder).optional().default(SortOrder.DESC),
})

// Response schemas
export const AnswerListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(AnswerWithTranslationType),
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
export type AnswerType = z.infer<typeof AnswerType>
export type AnswerWithTranslationType = z.infer<typeof AnswerWithTranslationType>
export type CreateAnswerBodyType = z.infer<typeof CreateAnswerBodyType>
export type UpdateAnswerBodyType = z.infer<typeof UpdateAnswerBodyType>
export type GetAnswerByIdParamsType = z.infer<typeof GetAnswerByIdParamsType>
export type GetAnswerListQueryType = z.infer<typeof GetAnswerListQueryType>
export type AnswerListResType = z.infer<typeof AnswerListResSchema>
