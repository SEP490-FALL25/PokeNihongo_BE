import { createZodDto } from 'nestjs-zod'
import {
  CreateMatchBodySchema,
  CreateMatchResSchema,
  GetMatchDetailResSchema,
  GetMatchDetailWithAllLangResSchema,
  GetMatchParamsSchema,
  UpdateMatchBodySchema,
  UpdateMatchResSchema
} from '../entities/match.entity'

export class CreateMatchBodyDTO extends createZodDto(CreateMatchBodySchema) {}

export class CreateMatchResDTO extends createZodDto(CreateMatchResSchema) {}

export class UpdateMatchBodyDTO extends createZodDto(UpdateMatchBodySchema) {}

export class UpdateMatchResDTO extends createZodDto(UpdateMatchResSchema) {}

export class GetMatchParamsDTO extends createZodDto(GetMatchParamsSchema) {}

export class GetMatchDetailResDTO extends createZodDto(GetMatchDetailResSchema) {}

export class GetMatchDetailWithAllLangResDTO extends createZodDto(
  GetMatchDetailWithAllLangResSchema
) {}
