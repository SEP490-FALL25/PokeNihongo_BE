import { checkIdSchema } from '@/common/utils/id.validation'
import { LeaderboardSeasonMessage } from '@/i18n/message-keys'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const LeaderboardSeasonSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean(),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateLeaderboardSeasonBodyInputSchema = LeaderboardSeasonSchema.pick({
  startDate: true,
  endDate: true,
  isActive: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema,
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional()
  })

export const CreateLeaderboardSeasonBodySchema = LeaderboardSeasonSchema.pick({
  nameKey: true,
  startDate: true,
  endDate: true,
  isActive: true
}).strict()

export const CreateLeaderboardSeasonResSchema = z.object({
  statusCode: z.number(),
  data: LeaderboardSeasonSchema,
  message: z.string()
})

export const UpdateLeaderboardSeasonBodyInputSchema =
  CreateLeaderboardSeasonBodyInputSchema.partial().strict()

export const UpdateLeaderboardSeasonBodySchema =
  CreateLeaderboardSeasonBodySchema.partial().strict()

export const UpdateLeaderboardSeasonResSchema = CreateLeaderboardSeasonResSchema

export const GetLeaderboardSeasonParamsSchema = z
  .object({
    leaderboardSeasonId: checkIdSchema(LeaderboardSeasonMessage.INVALID_DATA)
  })
  .strict()

export const GetLeaderboardSeasonDetailWithAllLangResSchema = z.object({
  statusCode: z.number(),
  data: LeaderboardSeasonSchema.extend({
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

export const GetLeaderboardSeasonDetailResSchema = z.object({
  statusCode: z.number(),
  data: LeaderboardSeasonSchema.extend({
    nameTranslation: z.string().nullable().optional(),
    nameTranslations: TranslationInputSchema.optional().nullable()
  }),
  message: z.string()
})

export type LeaderboardSeasonType = z.infer<typeof LeaderboardSeasonSchema>
export type CreateLeaderboardSeasonBodyInputType = z.infer<
  typeof CreateLeaderboardSeasonBodyInputSchema
>
export type CreateLeaderboardSeasonBodyType = z.infer<
  typeof CreateLeaderboardSeasonBodySchema
>
export type UpdateLeaderboardSeasonBodyInputType = z.infer<
  typeof UpdateLeaderboardSeasonBodyInputSchema
>
export type UpdateLeaderboardSeasonBodyType = z.infer<
  typeof UpdateLeaderboardSeasonBodySchema
>
export type GetLeaderboardSeasonParamsType = z.infer<
  typeof GetLeaderboardSeasonParamsSchema
>
export type GetLeaderboardSeasonDetailResType = z.infer<
  typeof GetLeaderboardSeasonDetailResSchema
>

type LeaderboardSeasonFieldType = keyof z.infer<typeof LeaderboardSeasonSchema>
export const LEADERBOARD_SEASON_FIELDS = [
  ...Object.keys(LeaderboardSeasonSchema.shape),
  'nameTranslation'
] as LeaderboardSeasonFieldType[]
