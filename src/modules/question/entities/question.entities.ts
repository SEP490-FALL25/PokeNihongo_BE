import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Question Entity Types
export const QuestionType = z.object({
    id: z.number(),
    questionJp: z.string(),
    questionOrder: z.number(),
    questionKey: z.string(),
    exercisesId: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

// Request/Response Types
export const CreateQuestionBodyType = z.object({
    questionJp: z.string().min(1, 'Nội dung câu hỏi không được để trống').max(1000, 'Nội dung câu hỏi không được vượt quá 1000 ký tự'),
    questionOrder: z.number().min(0, 'Thứ tự câu hỏi không được âm').default(0),
    exercisesId: z.number().min(1, 'ID bài tập không hợp lệ'),
})

export const UpdateQuestionBodyType = z.object({
    questionJp: z.string().min(1, 'Nội dung câu hỏi không được để trống').max(1000, 'Nội dung câu hỏi không được vượt quá 1000 ký tự').optional(),
    questionOrder: z.number().min(0, 'Thứ tự câu hỏi không được âm').optional(),
    exercisesId: z.number().min(1, 'ID bài tập không hợp lệ').optional(),
})

export const GetQuestionByIdParamsType = z.object({
    id: z.string().transform(Number),
})

export const GetQuestionListQueryType = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    exercisesId: z.string().transform(Number).optional(),
    search: z.string().optional(),
})

// Response schemas
export const QuestionListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(QuestionType),
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
export type QuestionType = z.infer<typeof QuestionType>
export type CreateQuestionBodyType = z.infer<typeof CreateQuestionBodyType>
export type UpdateQuestionBodyType = z.infer<typeof UpdateQuestionBodyType>
export type GetQuestionByIdParamsType = z.infer<typeof GetQuestionByIdParamsType>
export type GetQuestionListQueryType = z.infer<typeof GetQuestionListQueryType>
export type QuestionListResType = z.infer<typeof QuestionListResSchema>
