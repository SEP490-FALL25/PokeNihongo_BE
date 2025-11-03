import { MatchRoundNumber, RoundStatus } from '@/common/constants/match.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { MatchRoundMessage } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const MatchRoundSchema = z.object({
  id: z.number(),
  matchId: z.number(),
  roundNumber: z
    .enum([MatchRoundNumber.ONE, MatchRoundNumber.TWO, MatchRoundNumber.THREE])
    .default(MatchRoundNumber.ONE),
  status: z
    .enum([
      RoundStatus.SELECTING_POKEMON,
      RoundStatus.PENDING,
      RoundStatus.IN_PROGRESS,
      RoundStatus.COMPLETED
    ])
    .default(RoundStatus.SELECTING_POKEMON),
  roundWinnerId: z.number().optional().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateMatchRoundBodySchema = MatchRoundSchema.pick({
  matchId: true,
  roundNumber: true
}).strict()

export const CreateMatchRoundResSchema = z.object({
  statusCode: z.number(),
  data: MatchRoundSchema,
  message: z.string()
})

export const UpdateMatchRoundBodySchema = CreateMatchRoundBodySchema.partial().strict()

export const UpdateMatchRoundResSchema = CreateMatchRoundResSchema

export const GetMatchRoundParamsSchema = z
  .object({
    matchRoundId: checkIdSchema(MatchRoundMessage.INVALID_DATA)
  })
  .strict()

export const GetMatchRoundDetailWithAllLangResSchema = z.object({
  statusCode: z.number(),
  data: MatchRoundSchema,
  message: z.string()
})

export const GetMatchRoundDetailResSchema = z.object({
  statusCode: z.number(),
  data: MatchRoundSchema,
  message: z.string()
})

export type MatchRoundType = z.infer<typeof MatchRoundSchema>

export type CreateMatchRoundBodyType = z.infer<typeof CreateMatchRoundBodySchema>

export type UpdateMatchRoundBodyType = z.infer<typeof UpdateMatchRoundBodySchema>
export type GetMatchRoundParamsType = z.infer<typeof GetMatchRoundParamsSchema>
export type GetMatchRoundDetailResType = z.infer<typeof GetMatchRoundDetailResSchema>

type MatchRoundFieldType = keyof z.infer<typeof MatchRoundSchema>
export const MATCH_FIELDS = [
  ...Object.keys(MatchRoundSchema.shape)
] as MatchRoundFieldType[]
