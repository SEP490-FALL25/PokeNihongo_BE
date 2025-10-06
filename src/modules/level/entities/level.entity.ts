import { LEVEL_TYPE } from '@/common/constants/level.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { LevelMessage } from '@/i18n/message-keys'
import { RewardSchema } from '@/modules/reward/entities/reward.entity'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const LevelSchema = z.object({
  id: z.number(),
  levelNumber: z.number().min(1, LevelMessage.LEVEL_NUMBER_MIN),
  requiredExp: z.number().min(0, LevelMessage.REQUIRED_EXP_REQUIRED),
  levelType: z.enum([LEVEL_TYPE.USER, LEVEL_TYPE.POKEMON]),
  nextLevelId: z.number().optional().nullable(),
  rewardId: z.number().optional().nullable(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateLevelBodySchema = LevelSchema.pick({
  levelNumber: true,
  requiredExp: true,
  levelType: true,
  nextLevelId: true,
  rewardId: true
}).strict()

export const CreateLevelResSchema = z.object({
  statusCode: z.number(),
  data: LevelSchema,
  message: z.string()
})

export const UpdateLevelBodySchema = CreateLevelBodySchema.partial().strict()

export const UpdateLevelResSchema = CreateLevelResSchema

export const GetLevelParamsSchema = z
  .object({
    levelId: checkIdSchema(LevelMessage.INVALID_DATA)
  })
  .strict()

export const GetLevelDetailResSchema = z.object({
  statusCode: z.number(),
  data: z.object({
    ...LevelSchema.shape,
    reward: RewardSchema.nullable(),
    nextLevel: LevelSchema.omit({ nextLevelId: true, rewardId: true }).nullable()
  }),
  message: z.string()
})

export type LevelType = z.infer<typeof LevelSchema>
export type CreateLevelBodyType = z.infer<typeof CreateLevelBodySchema>
export type UpdateLevelBodyType = z.infer<typeof UpdateLevelBodySchema>
export type GetLevelParamsType = z.infer<typeof GetLevelParamsSchema>
export type GetLevelDetailResType = z.infer<typeof GetLevelDetailResSchema>

type LevelFieldType = keyof z.infer<typeof LevelSchema>
export const LEVEL_FIELDS = Object.keys(LevelSchema.shape) as LevelFieldType[]
