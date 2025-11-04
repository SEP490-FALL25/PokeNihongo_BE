import { createZodDto } from 'nestjs-zod'
import {
  CreateMatchRoundBodySchema,
  CreateMatchRoundResSchema,
  GetMatchRoundDetailForUserResponseSchema,
  GetMatchRoundDetailResSchema,
  GetMatchRoundDetailWithAllLangResSchema,
  GetMatchRoundParamsSchema,
  UpdateMatchRoundBodySchema,
  UpdateMatchRoundResSchema
} from '../entities/match-round.entity'

export class CreateMatchRoundBodyDTO extends createZodDto(CreateMatchRoundBodySchema) {}

export class CreateMatchRoundResDTO extends createZodDto(CreateMatchRoundResSchema) {}

export class UpdateMatchRoundBodyDTO extends createZodDto(UpdateMatchRoundBodySchema) {}

export class UpdateMatchRoundResDTO extends createZodDto(UpdateMatchRoundResSchema) {}

export class GetMatchRoundParamsDTO extends createZodDto(GetMatchRoundParamsSchema) {}

export class GetMatchRoundDetailResDTO extends createZodDto(
  GetMatchRoundDetailResSchema
) {}

export class GetMatchRoundDetailWithAllLangResDTO extends createZodDto(
  GetMatchRoundDetailWithAllLangResSchema
) {}

export class GetMatchRoundDetailForUserResDTO extends createZodDto(
  GetMatchRoundDetailForUserResponseSchema
) {}
