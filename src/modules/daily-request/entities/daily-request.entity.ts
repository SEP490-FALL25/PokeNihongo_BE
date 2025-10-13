import { DailyConditionType } from '@/common/constants/daily-request.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { RewardSchema } from '@/modules/reward/entities/reward.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()
export const DailyRequestSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  conditionType: z.enum([
    DailyConditionType.LOGIN,
    DailyConditionType.COMPLETE_LESSON,
    DailyConditionType.STREAK_LOGIN
  ]),
  conditionValue: z.number().min(1),
  rewardId: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateDailyRequestBodyInputSchema = DailyRequestSchema.pick({
  conditionType: true,
  conditionValue: true,
  rewardId: true,
  isActive: true
})
  .extend({
    nameTranslations: TranslationInputSchema,
    descriptionTranslations: TranslationInputSchema
  })
  .strict()

export const CreateDailyRequestBodySchema = DailyRequestSchema.pick({
  nameKey: true,
  descriptionKey: true,
  conditionType: true,
  conditionValue: true,
  rewardId: true,
  isActive: true
}).strict()

export const CreateDailyRequestResSchema = z.object({
  statusCode: z.number(),
  data: DailyRequestSchema,
  message: z.string()
})

export const UpdateDailyRequestBodyInputSchema =
  CreateDailyRequestBodyInputSchema.partial().strict()

export const UpdateDailyRequestBodySchema =
  CreateDailyRequestBodySchema.partial().strict()

export const UpdateDailyRequestResSchema = CreateDailyRequestResSchema

export const GetParamsDailyRequestSchema = z.object({
  dailyRequestId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetDailyRequestDetailResSchema = z.object({
  statusCode: z.number(),
  data: DailyRequestSchema.extend({
    nameTranslation: z.string().nullable(),
    descriptionTranslation: z.string().nullable(),
    reward: RewardSchema.pick({
      name: true,
      rewardItem: true,
      rewardTarget: true,
      rewardType: true
    }).nullable()
  }),
  message: z.string()
})

// Type definitions
export type DailyRequestType = z.infer<typeof DailyRequestSchema>

export type CreateDailyRequestBodyInputType = z.infer<
  typeof CreateDailyRequestBodyInputSchema
>

export type CreateDailyRequestBodyType = z.infer<typeof CreateDailyRequestBodySchema>

export type UpdateDailyRequestBodyInputType = z.infer<
  typeof UpdateDailyRequestBodyInputSchema
>

export type UpdateDailyRequestBodyType = z.infer<typeof UpdateDailyRequestBodySchema>

export type GetParamsDailyRequestType = z.infer<typeof GetParamsDailyRequestSchema>

export type GetParamDailyRequestDetailType = z.infer<
  typeof GetDailyRequestDetailResSchema
>

// Field

type DailyRequestFieldType = keyof z.infer<typeof DailyRequestSchema>
export const REWARD_FIELDS = Object.keys(
  DailyRequestSchema.shape
) as DailyRequestFieldType[]
