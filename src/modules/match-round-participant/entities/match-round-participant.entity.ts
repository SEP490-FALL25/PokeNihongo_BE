import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base MatchParticipant Schema
export const MatchParticipantSchema = z.object({
  id: z.number(),
  matchParticipantId: z.number(),
  matchRoundId: z.number(),
  selectedUserPokemonId: z.number().nullable(),
  points: z.number().nullable(),
  totalTimeMs: z.number().default(0),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateMatchParticipantBodySchema = MatchParticipantSchema.pick({
  matchId: true,
  userId: true
}).strict()

export const CreateMatchParticipantResSchema = z.object({
  statusCode: z.number(),
  data: MatchParticipantSchema,
  message: z.string()
})

// Update Schema
export const UpdateMatchParticipantBodySchema =
  CreateMatchParticipantBodySchema.partial().strict()

export const UpdateMatchParticipantResSchema = CreateMatchParticipantResSchema

export const UpdateWithListItemResSchema = z.object({
  statusCode: z.number(),
  data: z.array(MatchParticipantSchema),
  message: z.string()
})

// Query Schema
export const GetMatchParticipantParamsSchema = z.object({
  matchParticipantId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetMatchParticipantDetailSchema = MatchParticipantSchema

export const GetMatchParticipantDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetMatchParticipantDetailSchema,
  message: z.string()
})

// Type exports
export type MatchParticipantType = z.infer<typeof MatchParticipantSchema>
export type CreateMatchParticipantBodyType = z.infer<
  typeof CreateMatchParticipantBodySchema
>
export type UpdateMatchParticipantBodyType = z.infer<
  typeof UpdateMatchParticipantBodySchema
>
export type GetMatchParticipantParamsType = z.infer<
  typeof GetMatchParticipantParamsSchema
>

// Field for query
export type MatchParticipantFieldType = keyof z.infer<typeof MatchParticipantSchema>
export const MATCH_PARTICIPANT_FIELDS = Object.keys(
  MatchParticipantSchema.shape
) as MatchParticipantFieldType[]
