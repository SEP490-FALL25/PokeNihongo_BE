import { RewardTarget, RewardType } from '@/common/constants/reward.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { RewardMessage } from '@/i18n/message-keys'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const RewardSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  rewardType: z.enum([
    RewardType.LESSON,
    RewardType.DAILY_REQUEST,
    RewardType.EVENT,
    RewardType.ACHIEVEMENT,
    RewardType.LEVEL
  ]),
  rewardItem: z.number().min(0),
  rewardTarget: z.enum([
    RewardTarget.EXP,
    RewardTarget.POINT,
    RewardTarget.POKEMON,
    RewardTarget.BADGE,
    RewardTarget.VOUCHER
  ]),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateRewardBodyInputSchema = RewardSchema.pick({
  rewardType: true,
  rewardItem: true,
  rewardTarget: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema
  })

export const CreateRewardBodySchema = RewardSchema.pick({
  nameKey: true,
  rewardType: true,
  rewardItem: true,
  rewardTarget: true
}).strict()

export const CreateRewardResSchema = z.object({
  statusCode: z.number(),
  data: RewardSchema,
  message: z.string()
})

export const UpdateRewardBodyInputSchema = CreateRewardBodyInputSchema.partial().strict()

export const UpdateRewardBodySchema = CreateRewardBodySchema.partial().strict()

export const UpdateRewardResSchema = CreateRewardResSchema

export const GetRewardParamsSchema = z
  .object({
    rewardId: checkIdSchema(RewardMessage.INVALID_DATA)
  })
  .strict()

export const GetRewardDetailWithAllLangResSchema = z.object({
  statusCode: z.number(),
  data: RewardSchema.extend({
    nameTranslations: z
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

export const GetRewardDetailResSchema = z.object({
  statusCode: z.number(),
  data: RewardSchema.extend({
    nameTranslation: z.string().nullable().optional()
  }),
  message: z.string()
})

export type RewardType = z.infer<typeof RewardSchema>
export type CreateRewardBodyInputType = z.infer<typeof CreateRewardBodyInputSchema>
export type CreateRewardBodyType = z.infer<typeof CreateRewardBodySchema>
export type UpdateRewardBodyInputType = z.infer<typeof UpdateRewardBodyInputSchema>
export type UpdateRewardBodyType = z.infer<typeof UpdateRewardBodySchema>
export type GetRewardParamsType = z.infer<typeof GetRewardParamsSchema>
export type GetRewardDetailResType = z.infer<typeof GetRewardDetailResSchema>

type RewardFieldType = keyof z.infer<typeof RewardSchema>
export const REWARD_FIELDS = [
  ...Object.keys(RewardSchema.shape),
  'nameTranslation'
] as RewardFieldType[]
