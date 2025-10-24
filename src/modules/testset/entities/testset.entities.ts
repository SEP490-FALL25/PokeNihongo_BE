import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
import { TestSetStatus, QuestionType } from '@prisma/client'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// TestSet Schema
export const TestSetSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    audioUrl: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    levelN: z.number().nullable().optional(),
    testType: z.nativeEnum(QuestionType),
    status: z.nativeEnum(TestSetStatus),
    creatorId: z.number().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date()
})


// Create TestSet Schema
export const CreateTestSetBodySchema = z.object({
    name: z.string(),
    description: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    audioUrl: z.string().nullable().optional(),
    price: z.number().nullable().optional(),
    levelN: z.number().nullable().optional(),
    testType: z.nativeEnum(QuestionType),
    status: z.nativeEnum(TestSetStatus).default(TestSetStatus.DRAFT)
}).strict()

// Update TestSet Schema
export const UpdateTestSetBodySchema = CreateTestSetBodySchema.partial().strict()

// TestSet Response Schema
export const TestSetResSchema = z
    .object({
        statusCode: z.number(),
        data: TestSetSchema,
        message: z.string()
    })
    .strict()

// TestSet List Response Schema
export const TestSetListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            results: z.array(TestSetSchema),
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


// Get TestSet by ID Params Schema
export const GetTestSetByIdParamsSchema = z
    .object({
        id: z.string().transform((val) => parseInt(val, 10))
    })
    .strict()

// Get TestSet List Query Schema
export const GetTestSetListQuerySchema = z
    .object({
        currentPage: z.string().transform((val) => parseInt(val, 10)).optional().default('1'),
        pageSize: z.string().transform((val) => parseInt(val, 10)).optional().default('10'),
        search: z.string().optional(),
        levelN: z.string().transform((val) => parseInt(val, 10)).optional(),
        testType: z.nativeEnum(QuestionType).optional(),
        status: z.nativeEnum(TestSetStatus).optional(),
        creatorId: z.string().transform((val) => parseInt(val, 10)).optional()
    })
    .strict()


// Types
export type TestSetType = z.infer<typeof TestSetSchema>
export type CreateTestSetBodyType = z.infer<typeof CreateTestSetBodySchema>
export type UpdateTestSetBodyType = z.infer<typeof UpdateTestSetBodySchema>
export type TestSetResType = z.infer<typeof TestSetResSchema>
export type TestSetListResType = z.infer<typeof TestSetListResSchema>
export type GetTestSetByIdParamsType = z.infer<typeof GetTestSetByIdParamsSchema>
export type GetTestSetListQueryType = z.infer<typeof GetTestSetListQuerySchema>
