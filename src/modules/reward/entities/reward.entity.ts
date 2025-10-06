import { RewardTarget, RewardType } from '@/common/constants/reward.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { RewardMessage } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const RewardSchema = z.object({
  id: z.number(),
  name: z.string().nonempty(RewardMessage.NAME_REQUIRED),
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

export const CreateRewardBodySchema = RewardSchema.pick({
  name: true,
  rewardType: true,
  rewardItem: true,
  rewardTarget: true
}).strict()

export const CreateRewardResSchema = z.object({
  statusCode: z.number(),
  data: RewardSchema,
  message: z.string()
})

export const UpdateRewardBodySchema = CreateRewardBodySchema

export const UpdateRewardResSchema = CreateRewardResSchema

export const GetRewardParamsSchema = z
  .object({
    rewardId: checkIdSchema(RewardMessage.INVALID_DATA)
  })
  .strict()

export const GetRewardDetailResSchema = CreateRewardResSchema

export type RewardType = z.infer<typeof RewardSchema>
export type CreateRewardBodyType = z.infer<typeof CreateRewardBodySchema>
export type UpdateRewardBodyType = z.infer<typeof UpdateRewardBodySchema>
export type GetRewardParamsType = z.infer<typeof GetRewardParamsSchema>
export type GetRewardDetailResType = z.infer<typeof GetRewardDetailResSchema>

type RewardFieldType = keyof z.infer<typeof RewardSchema>
export const REWARD_FIELDS = Object.keys(RewardSchema.shape) as RewardFieldType[]
