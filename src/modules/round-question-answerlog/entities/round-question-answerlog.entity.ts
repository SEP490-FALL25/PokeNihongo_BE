import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base RoundQuestionsAnswerLog Schema
export const RoundQuestionsAnswerLogSchema = z.object({
  id: z.number(),
  roundQuestionId: z.number(),
  answerId: z.number().nullable(),
  isCorrect: z.boolean(),
  timeAnswerMs: z.number().default(60000),
  pointsEarned: z.number().default(100),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateRoundQuestionsAnswerLogBodySchema = RoundQuestionsAnswerLogSchema.pick(
  {
    roundQuestionId: true,
    answerId: true,
    isCorrect: true,
    timeAnswerMs: true,
    pointsEarned: true
  }
)

  .strict()

export const CreateRoundQuestionsAnswerLogResSchema = z.object({
  statusCode: z.number(),
  data: RoundQuestionsAnswerLogSchema,
  message: z.string()
})

// Update Schema
export const UpdateRoundQuestionsAnswerLogBodySchema =
  CreateRoundQuestionsAnswerLogBodySchema.partial().strict()

export const UpdateRoundQuestionsAnswerLogResSchema =
  CreateRoundQuestionsAnswerLogResSchema

export const UpdateWithListItemResSchema = z.object({
  statusCode: z.number(),
  data: z.array(RoundQuestionsAnswerLogSchema),
  message: z.string()
})

// Query Schema
export const GetRoundQuestionsAnswerLogParamsSchema = z.object({
  roundQuestionsAnswerLogId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetRoundQuestionsAnswerLogDetailSchema = RoundQuestionsAnswerLogSchema

export const GetRoundQuestionsAnswerLogDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetRoundQuestionsAnswerLogDetailSchema,
  message: z.string()
})

// Type exports
export type RoundQuestionsAnswerLogType = z.infer<typeof RoundQuestionsAnswerLogSchema>
export type CreateRoundQuestionsAnswerLogBodyType = z.infer<
  typeof CreateRoundQuestionsAnswerLogBodySchema
>
export type UpdateRoundQuestionsAnswerLogBodyType = z.infer<
  typeof UpdateRoundQuestionsAnswerLogBodySchema
>
export type GetRoundQuestionsAnswerLogParamsType = z.infer<
  typeof GetRoundQuestionsAnswerLogParamsSchema
>

// Field for query
export type RoundQuestionsAnswerLogFieldType = keyof z.infer<
  typeof RoundQuestionsAnswerLogSchema
>
export const USER_SEASON_HISTORY_FIELDS = Object.keys(
  RoundQuestionsAnswerLogSchema.shape
) as RoundQuestionsAnswerLogFieldType[]
