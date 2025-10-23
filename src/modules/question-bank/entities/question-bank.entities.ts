import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// QuestionBankStatus enum
export enum QuestionBankStatusEnum {
    DRAFT = 'DRAFT', // Bản nháp
    ACTIVE = 'ACTIVE', // Hoạt động
    INACTIVE = 'INACTIVE' // Không hoạt động
}

// Question_Bank schema
export const QuestionBankSchema = z.object({
    id: z.number(),
    levelN: z.number().min(1).max(5).nullable().optional(),
    bankType: z.string().min(1, 'Bank type không được để trống').max(50, 'Bank type quá dài'), // Loại bài tập
    status: z.nativeEnum(QuestionBankStatusEnum),
    questionId: z.number(),
    creatorId: z.number().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date()
})

export const CreateQuestionBankBodySchema = QuestionBankSchema.pick({
    levelN: true,
    bankType: true,
    status: true,
    questionId: true
}).strict()

export const UpdateQuestionBankBodySchema = QuestionBankSchema.pick({
    levelN: true,
    bankType: true,
    status: true
}).partial().strict()

export const QuestionBankResSchema = z
    .object({
        statusCode: z.number(),
        data: QuestionBankSchema,
        message: z.string()
    })
    .strict()

export const QuestionBankListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(QuestionBankSchema),
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

export const GetQuestionBankByIdParamsSchema = z
    .object({
        id: z.string().transform((val) => parseInt(val, 10))
    })
    .strict()

export const GetQuestionBankListQuerySchema = z
    .object({
        currentPage: z.string().transform((val) => parseInt(val, 10)).optional().default('1'),
        pageSize: z.string().transform((val) => parseInt(val, 10)).optional().default('10'),
        levelN: z.string().transform((val) => parseInt(val, 10)).optional(),
        bankType: z.string().optional(),
        status: z.nativeEnum(QuestionBankStatusEnum).optional(),
        search: z.string().optional()
    })
    .strict()

// Types
export type QuestionBankType = z.infer<typeof QuestionBankSchema>
export type CreateQuestionBankBodyType = z.infer<typeof CreateQuestionBankBodySchema>
export type UpdateQuestionBankBodyType = z.infer<typeof UpdateQuestionBankBodySchema>
export type QuestionBankResType = z.infer<typeof QuestionBankResSchema>
export type QuestionBankListResType = z.infer<typeof QuestionBankListResSchema>
export type GetQuestionBankByIdParamsType = z.infer<typeof GetQuestionBankByIdParamsSchema>
export type GetQuestionBankListQueryType = z.infer<typeof GetQuestionBankListQuerySchema>

