import { UserAchievementStatus } from '@/common/constants/achievement.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base UserAchievement Schema
export const UserAchievementSchema = z.object({
  id: z.number(),
  userId: z.number(),
  achievementId: z.number(),
  achievedAt: z.date().nullable(),
  status: z
    .enum([
      UserAchievementStatus.IN_PROGRESS,
      UserAchievementStatus.COMPLETED_NOT_CLAIMED,
      UserAchievementStatus.CLAIMED
    ])
    .default(UserAchievementStatus.IN_PROGRESS),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateUserAchievementBodySchema = UserAchievementSchema.pick({
  userId: true,
  achievementId: true,
  status: true
}).strict()

export const CreateUserAchievementResSchema = z.object({
  statusCode: z.number(),
  data: UserAchievementSchema,
  message: z.string()
})

// Update Schema
export const UpdateUserAchievementBodySchema =
  CreateUserAchievementBodySchema.partial().strict()

export const UpdateUserAchievementResSchema = CreateUserAchievementResSchema

export const UpdateWithListItemResSchema = z.object({
  statusCode: z.number(),
  data: z.array(UserAchievementSchema),
  message: z.string()
})

// Query Schema
export const GetUserAchievementParamsSchema = z.object({
  userAchievementId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetUserAchievementDetailSchema = UserAchievementSchema

export const GetUserAchievementDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetUserAchievementDetailSchema,
  message: z.string()
})

// Type exports
export type UserAchievementType = z.infer<typeof UserAchievementSchema>
export type CreateUserAchievementBodyType = z.infer<
  typeof CreateUserAchievementBodySchema
>
export type UpdateUserAchievementBodyType = z.infer<
  typeof UpdateUserAchievementBodySchema
>
export type GetUserAchievementParamsType = z.infer<typeof GetUserAchievementParamsSchema>

// Field for query
export type UserAchievementFieldType = keyof z.infer<typeof UserAchievementSchema>
export const USER_GACHA_PITY_FIELDS = Object.keys(
  UserAchievementSchema.shape
) as UserAchievementFieldType[]
