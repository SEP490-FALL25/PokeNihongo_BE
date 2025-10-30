import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base GachaPurchase Schema
export const GachaPurchaseSchema = z.object({
  id: z.number(),
  userId: z.number(),
  bannerId: z.number(),
  walletTransId: z.number().nullable(),
  rollCount: z.number().min(1),
  totalCost: z.number().min(0),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateGachaPurchaseBodySchema = GachaPurchaseSchema.pick({
  userId: true,
  bannerId: true,
  walletTransId: true,
  rollCount: true
}).strict()

export const CreateGachaPurchaseResSchema = z.object({
  statusCode: z.number(),
  data: GachaPurchaseSchema,
  message: z.string()
})

// Update Schema
export const UpdateGachaPurchaseBodySchema = CreateGachaPurchaseBodySchema.extend({})
  .partial()
  .strict()

export const UpdateGachaPurchaseResSchema = CreateGachaPurchaseResSchema

// Query Schema
export const GetGachaPurchaseParamsSchema = z.object({
  gachaPurchaseId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetGachaPurchaseDetailSchema = GachaPurchaseSchema.extend({})

export const GetGachaPurchaseListResSchema = z.object({
  statusCode: z.number(),
  data: z.array(GetGachaPurchaseDetailSchema),
  message: z.string()
})

export const GetGachaPurchaseDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetGachaPurchaseDetailSchema,
  message: z.string()
})

// Type exports
export type GachaPurchaseType = z.infer<typeof GachaPurchaseSchema>
export type CreateGachaPurchaseBodyType = z.infer<typeof CreateGachaPurchaseBodySchema>
export type UpdateGachaPurchaseBodyType = z.infer<typeof UpdateGachaPurchaseBodySchema>
export type GetGachaPurchaseParamsType = z.infer<typeof GetGachaPurchaseParamsSchema>
export type GetGachaPurchaseDetailType = z.infer<typeof GetGachaPurchaseDetailSchema>

// Field for query
export type GachaPurchaseFieldType = keyof z.infer<typeof GachaPurchaseSchema>
export const SHOP_PURCHASE_FIELDS = Object.keys(
  GachaPurchaseSchema.shape
) as GachaPurchaseFieldType[]
