import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base SeasonRankReward Schema
export const SeasonRankRewardSchema = z.object({
  id: z.number(),
  seasonId: z.number(),
  rankName: z.enum(['N5', 'N4', 'N3']).default('N5'),
  order: z.number().min(1).default(1),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateSeasonRankRewardBodySchema = SeasonRankRewardSchema.pick({
  seasonId: true,
  rankName: true,
  order: true
})

  .strict()

export const CreateSeasonRankRewardResSchema = z.object({
  statusCode: z.number(),
  data: SeasonRankRewardSchema,
  message: z.string()
})

// Update Schema
export const UpdateSeasonRankRewardBodySchema =
  CreateSeasonRankRewardBodySchema.partial().strict()

export const UpdateSeasonRankRewardResSchema = CreateSeasonRankRewardResSchema

export const UpdateWithListItemResSchema = z.object({
  statusCode: z.number(),
  data: z.array(SeasonRankRewardSchema),
  message: z.string()
})

// Query Schema
export const GetSeasonRankRewardParamsSchema = z.object({
  seasonRankRewardId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetSeasonRankRewardDetailSchema = SeasonRankRewardSchema

export const GetSeasonRankRewardDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetSeasonRankRewardDetailSchema,
  message: z.string()
})

// Type exports
export type SeasonRankRewardType = z.infer<typeof SeasonRankRewardSchema>
export type CreateSeasonRankRewardBodyType = z.infer<
  typeof CreateSeasonRankRewardBodySchema
>
export type UpdateSeasonRankRewardBodyType = z.infer<
  typeof UpdateSeasonRankRewardBodySchema
>
export type GetSeasonRankRewardParamsType = z.infer<
  typeof GetSeasonRankRewardParamsSchema
>

// Field for query
export type SeasonRankRewardFieldType = keyof z.infer<typeof SeasonRankRewardSchema>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  SeasonRankRewardSchema.shape
) as SeasonRankRewardFieldType[]
