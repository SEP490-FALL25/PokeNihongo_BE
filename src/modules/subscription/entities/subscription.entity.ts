import { TagNameSubscription } from '@/common/constants/subscription.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { SubscriptionMessage } from '@/i18n/message-keys'
import { SubscriptionFeatureSchema } from '@/modules/subscription-feature/entities/subscription-feature.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const SubscriptionSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  tagName: z
    .enum([
      TagNameSubscription.COMBO,
      TagNameSubscription.NORMAL,
      TagNameSubscription.ULTRA
    ])
    .default(TagNameSubscription.NORMAL),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateSubscriptionBodyInputSchema = SubscriptionSchema.pick({
  tagName: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema,
    descriptionTranslations: TranslationInputSchema
  })

export const CreateSubscriptionBodySchema = SubscriptionSchema.pick({
  nameKey: true,
  descriptionKey: true,
  tagName: true
}).strict()

export const CreateSubscriptionResSchema = z.object({
  statusCode: z.number(),
  data: SubscriptionSchema,
  message: z.string()
})

export const UpdateSubscriptionBodyInputSchema =
  CreateSubscriptionBodyInputSchema.partial().strict()

export const UpdateSubscriptionBodySchema =
  CreateSubscriptionBodySchema.partial().strict()

export const UpdateSubscriptionResSchema = CreateSubscriptionResSchema

export const GetSubscriptionParamsSchema = z
  .object({
    subscriptionId: checkIdSchema(SubscriptionMessage.INVALID_DATA)
  })
  .strict()

export const GetSubscriptionDetailWithAllLangResSchema = z.object({
  statusCode: z.number(),
  data: SubscriptionSchema.extend({
    nameTranslations: z
      .array(
        z.object({
          key: z.string(),
          value: z.string()
        })
      )
      .optional(),
    descriptionTranslations: z
      .array(
        z.object({
          key: z.string(),
          value: z.string()
        })
      )
      .optional()
  }),
  message: z.string()
})

export const GetLeaderboardWithRewardSeasonDetailSchema = SubscriptionSchema.pick({
  id: true,
  tagName: true
}).extend({
  nameTranslation: z.string().nullable().optional(),
  nameTranslations: TranslationInputSchema.nullable().optional(),
  descriptionTranslation: z.string().nullable().optional(),
  descriptionTranslations: TranslationInputSchema.nullable().optional()
})

export const GetLeaderboardWithRewardSeasonDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetLeaderboardWithRewardSeasonDetailSchema,
  message: z.string()
})
export const GetSubscriptionDetailResSchema = z.object({
  statusCode: z.number(),
  data: SubscriptionSchema.extend({
    nameTranslation: z.string().nullable().optional(),
    nameTranslations: TranslationInputSchema.nullable().optional(),
    descriptionTranslation: z.string().nullable().optional(),
    descriptionTranslations: TranslationInputSchema.nullable().optional(),
    features: z
      .array(
        SubscriptionFeatureSchema.pick({
          id: true,

          value: true
        })
      )
      .optional()
  }),
  message: z.string()
})

export type SubscriptionType = z.infer<typeof SubscriptionSchema>
export type CreateSubscriptionBodyInputType = z.infer<
  typeof CreateSubscriptionBodyInputSchema
>
export type CreateSubscriptionBodyType = z.infer<typeof CreateSubscriptionBodySchema>
export type UpdateSubscriptionBodyInputType = z.infer<
  typeof UpdateSubscriptionBodyInputSchema
>
export type UpdateSubscriptionBodyType = z.infer<typeof UpdateSubscriptionBodySchema>
export type GetSubscriptionParamsType = z.infer<typeof GetSubscriptionParamsSchema>
export type GetSubscriptionDetailResType = z.infer<typeof GetSubscriptionDetailResSchema>

type SubscriptionFieldType = keyof z.infer<typeof SubscriptionSchema>
export const LEADERBOARD_SEASON_FIELDS = [
  ...Object.keys(SubscriptionSchema.shape),
  'nameTranslation',
  'descriptionTranslation'
] as SubscriptionFieldType[]

// Marketplace Schemas
const MarketplaceFeatureSchema = z.object({
  id: z.number(),
  featureId: z.number(),
  value: z.string().nullable(),
  feature: z.object({
    id: z.number(),
    featureKey: z.string(),
    nameKey: z.string(),
    nameTranslation: z.string()
  })
})

const MarketplacePlanSchema = z.object({
  id: z.number(),
  subscriptionId: z.number(),
  price: z.number(),
  type: z.enum(['LIFETIME', 'RECURRING']),
  durationInDays: z.number().nullable(),
  isActive: z.boolean()
})

const MarketplaceSubscriptionSchema = z.object({
  id: z.number(),
  tagName: z.enum([
    TagNameSubscription.COMBO,
    TagNameSubscription.NORMAL,
    TagNameSubscription.ULTRA
  ]),
  nameTranslation: z.string(),
  descriptionTranslation: z.string(),
  plans: z.array(MarketplacePlanSchema),
  features: z.array(MarketplaceFeatureSchema),
  isPopular: z.boolean(),
  canBuy: z.boolean()
})

const MarketplaceSubscriptionOptionsSchema = z.object({
  id: z.number(),
  tagName: z.enum([
    TagNameSubscription.COMBO,
    TagNameSubscription.NORMAL,
    TagNameSubscription.ULTRA
  ]),
  nameTranslation: z.string(),
  descriptionTranslation: z.string(),
  plans: z.array(MarketplacePlanSchema),
  features: z.array(MarketplaceFeatureSchema)
})

export const GetMarketplaceListResSchema = z.object({
  statusCode: z.number(),
  data: z.array(MarketplaceSubscriptionSchema),
  message: z.string()
})

export const GetMarketplaceOptionsResSchema = z.object({
  statusCode: z.number(),
  data: MarketplaceSubscriptionOptionsSchema,
  message: z.string()
})
