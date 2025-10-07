import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

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

// Request/Response Types
export const CreateAnswerBodyType = z.object({
    answerJp: z.string().min(1, 'Nội dung câu trả lời không được để trống').max(1000, 'Nội dung câu trả lời không được vượt quá 1000 ký tự'),
    isCorrect: z.boolean().default(false),
    questionId: z.number().min(1, 'ID câu hỏi không hợp lệ'),
})

export const UpdateAnswerBodyType = z.object({
    answerJp: z.string().min(1, 'Nội dung câu trả lời không được để trống').max(1000, 'Nội dung câu trả lời không được vượt quá 1000 ký tự').optional(),
    isCorrect: z.boolean().optional(),
    questionId: z.number().min(1, 'ID câu hỏi không hợp lệ').optional(),
})

export const GetAnswerByIdParamsType = z.object({
    id: z.string().transform(Number),
})

export const GetAnswerListQueryType = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    questionId: z.string().transform(Number).optional(),
    isCorrect: z.string().transform(val => val === 'true').optional(),
    search: z.string().optional(),
})

// Response schemas
export const AnswerListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(AnswerType),
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
export type CreateAnswerBodyType = z.infer<typeof CreateAnswerBodyType>
export type UpdateAnswerBodyType = z.infer<typeof UpdateAnswerBodyType>
export type GetAnswerByIdParamsType = z.infer<typeof GetAnswerByIdParamsType>
export type GetAnswerListQueryType = z.infer<typeof GetAnswerListQueryType>
export type AnswerListResType = z.infer<typeof AnswerListResSchema>
