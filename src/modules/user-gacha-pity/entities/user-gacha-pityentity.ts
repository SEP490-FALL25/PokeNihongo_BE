import { GachaStarType } from '@/common/constants/gacha.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base GachaItemRate Schema
export const GachaItemRateSchema = z.object({
  id: z.number(),
  starType: z.enum([
    GachaStarType.ONE,
    GachaStarType.TWO,
    GachaStarType.THREE,
    GachaStarType.FOUR,
    GachaStarType.FIVE
  ]),
  rate: z.number().min(0).max(100),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateGachaItemRateBodySchema = GachaItemRateSchema.pick({
  starType: true,
  rate: true
}).strict()

export const CreateGachaItemRateResSchema = z.object({
  statusCode: z.number(),
  data: GachaItemRateSchema,
  message: z.string()
})

// Update Schema
export const UpdateGachaItemRateBodySchema =
  CreateGachaItemRateBodySchema.partial().strict()

export const UpdateGachaItemRateResSchema = CreateGachaItemRateResSchema

export const UpdateWithListItemResSchema = z.object({
  statusCode: z.number(),
  data: z.array(GachaItemRateSchema),
  message: z.string()
})

// Query Schema
export const GetGachaItemRateParamsSchema = z.object({
  gachaItemRateId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetGachaItemRateDetailSchema = GachaItemRateSchema

export const GetGachaItemRateDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetGachaItemRateDetailSchema,
  message: z.string()
})

// Type exports
export type GachaItemRateType = z.infer<typeof GachaItemRateSchema>
export type CreateGachaItemRateBodyType = z.infer<typeof CreateGachaItemRateBodySchema>
export type UpdateGachaItemRateBodyType = z.infer<typeof UpdateGachaItemRateBodySchema>
export type GetGachaItemRateParamsType = z.infer<typeof GetGachaItemRateParamsSchema>

// Field for query
export type GachaItemFieldType = keyof z.infer<typeof GachaItemRateSchema>
export const GACHA_ITEM_RATE_FIELDS = Object.keys(
  GachaItemRateSchema.shape
) as GachaItemFieldType[]
