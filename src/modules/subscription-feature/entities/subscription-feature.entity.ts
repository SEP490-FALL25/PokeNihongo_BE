import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base SubscriptionFeature Schema
export const SubscriptionFeatureSchema = z.object({
  id: z.number(),
  subscriptionId: z.number(),
  featureId: z.number(),

  value: z.string().nullable(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateSubscriptionFeatureBodySchema = SubscriptionFeatureSchema.pick({
  subscriptionId: true,
  featureId: true,
  value: true
}).strict()

export const CreateSubscriptionFeatureResSchema = z.object({
  statusCode: z.number(),
  data: SubscriptionFeatureSchema,
  message: z.string()
})

// Update Schema
export const UpdateSubscriptionFeatureBodySchema =
  CreateSubscriptionFeatureBodySchema.partial().strict()

export const UpdateSubscriptionFeatureResSchema = CreateSubscriptionFeatureResSchema

// Update with list of features for a subscription
export const UpdateWithListItemBodySchema = z.object({
  items: z
    .array(
      z.object({
        featureId: SubscriptionFeatureSchema.shape.featureId,
        value: SubscriptionFeatureSchema.shape.value
      })
    )
    .min(1)
})

export type UpdateWithListItemBodyType = z.infer<typeof UpdateWithListItemBodySchema>

export const UpdateWithListItemResSchema = z.object({
  statusCode: z.number(),
  data: z.array(SubscriptionFeatureSchema),
  message: z.string()
})

// Query Schema
export const GetSubscriptionFeatureParamsSchema = z.object({
  subscriptionFeatureId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetSubscriptionFeatureDetailSchema = SubscriptionFeatureSchema

export const GetSubscriptionFeatureDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetSubscriptionFeatureDetailSchema,
  message: z.string()
})

// Type exports
export type SubscriptionFeatureType = z.infer<typeof SubscriptionFeatureSchema>
export type CreateSubscriptionFeatureBodyType = z.infer<
  typeof CreateSubscriptionFeatureBodySchema
>
export type UpdateSubscriptionFeatureBodyType = z.infer<
  typeof UpdateSubscriptionFeatureBodySchema
>
export type GetSubscriptionFeatureParamsType = z.infer<
  typeof GetSubscriptionFeatureParamsSchema
>

// Field for query
export type SubscriptionFeatureFieldType = keyof z.infer<typeof SubscriptionFeatureSchema>
export const USER_GACHA_PITY_FIELDS = Object.keys(
  SubscriptionFeatureSchema.shape
) as SubscriptionFeatureFieldType[]
