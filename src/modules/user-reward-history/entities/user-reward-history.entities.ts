import { z } from 'zod'

export const RewardTargetSchema = z.enum(['EXP', 'POKEMON', 'POKE_COINS', 'SPARKLES'])

export const UserRewardSourceTypeSchema = z.enum([
  'REWARD_SERVICE',
  'LESSON',
  'DAILY_REQUEST',
  'ATTENDANCE',
  'SEASON_REWARD',
  'ADMIN_ADJUST',
  'OTHER',
  'ACHIEVEMENT_REWARD',
  'EXERCISE'
])

export const RewardInfoSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
  rewardType: z.string(),
  rewardItem: z.number(),
  rewardTarget: RewardTargetSchema
})

export const UserRewardHistorySchema = z.object({
  id: z.number(),
  userId: z.number(),
  rewardId: z.number().nullable(),
  rewardTargetSnapshot: RewardTargetSchema.nullable(),
  amount: z.number().nullable().optional(),
  sourceType: UserRewardSourceTypeSchema,
  sourceId: z.number().nullable().optional(),
  note: z.string().nullable().optional(),
  meta: z.unknown().nullable().optional(),
  createdAt: z.date(),
  reward: RewardInfoSchema.optional()
})

const CreateUserRewardHistoryBodySchemaBase = z
  .object({
    userId: z.number(),
    rewardId: z.number().optional(),
    rewardTargetSnapshot: RewardTargetSchema.optional(),
    amount: z.number().nullable().optional(),
    sourceType: UserRewardSourceTypeSchema,
    sourceId: z.number().optional(),
    note: z.string().max(1000).optional(),
    meta: z.unknown().optional()
  })
  .strict()

export const CreateUserRewardHistoryBodySchema =
  CreateUserRewardHistoryBodySchemaBase.refine(
    (data) => data.rewardId !== undefined || data.rewardTargetSnapshot !== undefined,
    {
      message: 'Phải cung cấp rewardId hoặc rewardTargetSnapshot',
      path: ['rewardId']
    }
  )

export const UpdateUserRewardHistoryBodySchema = z
  .object({
    rewardId: z.number().optional(),
    rewardTargetSnapshot: RewardTargetSchema.optional(),
    amount: z.number().nullable().optional(),
    sourceType: UserRewardSourceTypeSchema.optional(),
    sourceId: z.number().nullable().optional(),
    note: z.string().max(1000).optional(),
    meta: z.unknown().optional()
  })
  .strict()

export const GetUserRewardHistoryByIdParamsSchema = z
  .object({
    id: z.string().transform((val) => parseInt(val, 10))
  })
  .strict()

export const GetUserRewardHistoryListQuerySchema = z
  .object({
    currentPage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('1'),
    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('10'),
    userId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    rewardId: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    sourceType: UserRewardSourceTypeSchema.optional(),
    rewardTargetSnapshot: RewardTargetSchema.optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional()
  })
  .strict()

export const GetMyRewardHistoryQuerySchema = z
  .object({
    currentPage: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('1'),
    pageSize: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional()
      .default('10'),
    sourceType: UserRewardSourceTypeSchema.optional(),
    rewardTargetSnapshot: RewardTargetSchema.optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional()
  })
  .strict()

export const UserRewardHistoryResSchema = z
  .object({
    statusCode: z.number(),
    data: UserRewardHistorySchema,
    message: z.string()
  })
  .strict()

export const UserRewardHistoryListResSchema = z
  .object({
    statusCode: z.number(),
    data: z.object({
      results: z.array(UserRewardHistorySchema),
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

export type UserRewardHistoryType = z.infer<typeof UserRewardHistorySchema>
export type CreateUserRewardHistoryBodyType = z.infer<
  typeof CreateUserRewardHistoryBodySchema
>
export type UpdateUserRewardHistoryBodyType = z.infer<
  typeof UpdateUserRewardHistoryBodySchema
>
export type UserRewardHistoryResType = z.infer<typeof UserRewardHistoryResSchema>
export type UserRewardHistoryListResType = z.infer<typeof UserRewardHistoryListResSchema>
export type GetUserRewardHistoryByIdParamsType = z.infer<
  typeof GetUserRewardHistoryByIdParamsSchema
>
export type GetUserRewardHistoryListQueryType = z.infer<
  typeof GetUserRewardHistoryListQuerySchema
>
export type GetMyRewardHistoryQueryType = z.infer<typeof GetMyRewardHistoryQuerySchema>
