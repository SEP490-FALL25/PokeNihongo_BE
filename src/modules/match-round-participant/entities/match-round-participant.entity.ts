import { MatchRoundParticipantStatus } from '@/common/constants/match.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base MatchRoundParticipant Schema
export const MatchRoundParticipantSchema = z.object({
  id: z.number(),
  matchParticipantId: z.number(),
  matchRoundId: z.number(),
  orderSelected: z.number().default(1),
  endTimeSelected: z.date().nullable(),
  selectedUserPokemonId: z.number().nullable(),
  points: z.number().nullable(),
  totalTimeMs: z.number().nullable(),
  questionsTotal: z.number(),
  status: z
    .enum([
      MatchRoundParticipantStatus.SELECTING_POKEMON,
      MatchRoundParticipantStatus.PENDING,
      MatchRoundParticipantStatus.IN_PROGRESS,
      MatchRoundParticipantStatus.COMPLETED
    ])
    .default(MatchRoundParticipantStatus.SELECTING_POKEMON),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateMatchRoundParticipantBodySchema = MatchRoundParticipantSchema.pick({
  matchParticipantId: true,
  matchRoundId: true,
  selectedUserPokemonId: true
}).strict()

export const CreateMatchRoundParticipantResSchema = z.object({
  statusCode: z.number(),
  data: MatchRoundParticipantSchema,
  message: z.string()
})

// Update Schema
export const UpdateMatchRoundParticipantBodySchema = MatchRoundParticipantSchema.pick({
  matchParticipantId: true,
  matchRoundId: true,
  selectedUserPokemonId: true,
  endTimeSelected: true,
  status: true
})
  .partial()
  .strict()
export const ChoosePokemonMatchRoundParticipantBodySchema = z.object({
  pokemonId: z.number()
})

export const UpdateMatchRoundParticipantResSchema = CreateMatchRoundParticipantResSchema

export const UpdateWithListItemResSchema = z.object({
  statusCode: z.number(),
  data: z.array(MatchRoundParticipantSchema),
  message: z.string()
})

// Query Schema
export const GetMatchRoundParticipantParamsSchema = z.object({
  matchRoundParticipantId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetMatchRoundParticipantByRoundParamsSchema = z.object({
  matchRoundId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetMatchRoundParticipantDetailSchema = MatchRoundParticipantSchema

export const GetMatchRoundParticipantDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetMatchRoundParticipantDetailSchema,
  message: z.string()
})

// Type exports
export type MatchRoundParticipantType = z.infer<typeof MatchRoundParticipantSchema>
export type CreateMatchRoundParticipantBodyType = z.infer<
  typeof CreateMatchRoundParticipantBodySchema
>
export type UpdateMatchRoundParticipantBodyType = z.infer<
  typeof UpdateMatchRoundParticipantBodySchema
>
export type GetMatchRoundParticipantParamsType = z.infer<
  typeof GetMatchRoundParticipantParamsSchema
>

export type ChoosePokemonMatchRoundParticipantBodyType = z.infer<
  typeof ChoosePokemonMatchRoundParticipantBodySchema
>

// Field for query
export type MatchRoundParticipantFieldType = keyof z.infer<
  typeof MatchRoundParticipantSchema
>
export const MATCH_PARTICIPANT_FIELDS = Object.keys(
  MatchRoundParticipantSchema.shape
) as MatchRoundParticipantFieldType[]
