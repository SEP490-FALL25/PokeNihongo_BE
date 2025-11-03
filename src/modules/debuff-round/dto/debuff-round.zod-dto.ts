import { createZodDto } from 'nestjs-zod'
import {
  CreateDebuffRoundBodyInputSchema,
  CreateDebuffRoundResSchema,
  GetDebuffRoundDetailResSchema,
  GetDebuffRoundDetailWithAllLangResSchema,
  GetDebuffRoundParamsSchema,
  UpdateDebuffRoundBodyInputSchema,
  UpdateDebuffRoundResSchema
} from '../entities/debuff-round.entity'

export class CreatedDebuffRoundBodyInputDTO extends createZodDto(
  CreateDebuffRoundBodyInputSchema
) {}

export class CreateDebuffRoundResDTO extends createZodDto(CreateDebuffRoundResSchema) {}

export class UpdateDebuffRoundBodyInputDTO extends createZodDto(
  UpdateDebuffRoundBodyInputSchema
) {}

export class UpdateDebuffRoundResDTO extends createZodDto(UpdateDebuffRoundResSchema) {}

export class GetDebuffRoundParamsDTO extends createZodDto(GetDebuffRoundParamsSchema) {}

export class GetDebuffRoundDetailResDTO extends createZodDto(
  GetDebuffRoundDetailResSchema
) {}

export class GetDebuffRoundDetailWithAllLangResDTO extends createZodDto(
  GetDebuffRoundDetailWithAllLangResSchema
) {}
