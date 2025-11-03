
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { GeminiConfigType as GeminiConfigTypeEnum } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const GeminiConfigSchema = z.object({
    id: z.number(),
    configType: z.nativeEnum(GeminiConfigTypeEnum),
    modelName: z.string().min(1).max(100).default('gemini-1.5-pro'),
    prompt: z.string().min(1),
    isActive: z.boolean().default(true),

    createdById: z.number().nullable(),
    updatedById: z.number().nullable(),
    deletedById: z.number().nullable(),
    deletedAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date()
})

export const CreateGeminiConfigBodySchema = GeminiConfigSchema.pick({
    configType: true,
    modelName: true,
    prompt: true,
    isActive: true
}).strict()

export const CreateGeminiConfigResSchema = z.object({
    statusCode: z.number(),
    data: GeminiConfigSchema,
    message: z.string()
})

export const UpdateGeminiConfigBodySchema = CreateGeminiConfigBodySchema.partial().strict()

export const UpdateGeminiConfigResSchema = CreateGeminiConfigResSchema

export const GetParamsGeminiConfigSchema = z.object({
    geminiConfigId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetGeminiConfigResSchema = z.object({
    statusCode: z.number(),
    data: GeminiConfigSchema,
    message: z.string()
})

//type
export type GeminiConfigType = z.infer<typeof GeminiConfigSchema>
export type CreateGeminiConfigBodyType = z.infer<typeof CreateGeminiConfigBodySchema>
export type UpdateGeminiConfigBodyType = z.infer<typeof UpdateGeminiConfigBodySchema>
export type GetParamsGeminiConfigType = z.infer<typeof GetParamsGeminiConfigSchema>
export type GetGeminiConfigResType = z.infer<typeof GetGeminiConfigResSchema>

//field
type GeminiConfigFieldType = keyof z.infer<typeof GeminiConfigSchema>
export const GEMINI_CONFIG_FIELDS = Object.keys(
    GeminiConfigSchema.shape
) as GeminiConfigFieldType[]

