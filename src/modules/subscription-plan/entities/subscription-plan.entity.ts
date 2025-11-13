import { SubscriptionType } from '@/common/constants/subscription.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { SubscriptionSchema } from '@/modules/subscription/entities/subscription.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base SubscriptionPlan Schema
export const SubscriptionPlanSchema = z.object({
  id: z.number(),
  subscriptionId: z.number(),
  isActive: z.boolean().default(true),
  price: z.number().min(0),
  type: z.enum([SubscriptionType.LIFETIME, SubscriptionType.RECURRING]),
  durationInDays: z.number().min(0).nullable(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateSubscriptionPlanBodySchema = SubscriptionPlanSchema.pick({
  subscriptionId: true,
  isActive: true,
  price: true,
  type: true,
  durationInDays: true
}).strict()

export const CreateSubscriptionPlanResSchema = z.object({
  statusCode: z.number(),
  data: SubscriptionPlanSchema,
  message: z.string()
})

// Update Schema
export const UpdateSubscriptionPlanBodySchema =
  CreateSubscriptionPlanBodySchema.partial().strict()

export const UpdateSubscriptionPlanResSchema = CreateSubscriptionPlanResSchema

export const UpdateWithListItemResSchema = z.object({
  statusCode: z.number(),
  data: z.array(SubscriptionPlanSchema),
  message: z.string()
})

// Query Schema
export const GetSubscriptionPlanParamsSchema = z.object({
  subscriptionPlanId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetSubscriptionPlanDetailSchema = SubscriptionPlanSchema.extend({
  subscription: SubscriptionSchema.extend({
    nameTranslations: TranslationInputSchema,
    descriptionTranslations: TranslationInputSchema
  }).nullable()
})

export const GetSubscriptionPlanDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetSubscriptionPlanDetailSchema,
  message: z.string()
})

// Type exports
export type SubscriptionPlanType = z.infer<typeof SubscriptionPlanSchema>
export type CreateSubscriptionPlanBodyType = z.infer<
  typeof CreateSubscriptionPlanBodySchema
>
export type UpdateSubscriptionPlanBodyType = z.infer<
  typeof UpdateSubscriptionPlanBodySchema
>
export type GetSubscriptionPlanParamsType = z.infer<
  typeof GetSubscriptionPlanParamsSchema
>

// Field for query
export type SubscriptionPlanFieldType = keyof z.infer<typeof SubscriptionPlanSchema>
export const USER_GACHA_PITY_FIELDS = Object.keys(
  SubscriptionPlanSchema.shape
) as SubscriptionPlanFieldType[]
