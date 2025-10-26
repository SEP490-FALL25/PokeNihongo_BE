import { createZodDto } from 'nestjs-zod'
import {
  CreateDailyRequestBodyInputSchema,
  CreateDailyRequestResSchema,
  GetDailyRequestDetailResSchema,
  GetDailyRequestDetailwithAllLangResSchema,
  GetParamsDailyRequestSchema,
  UpdateDailyRequestBodyInputSchema,
  UpdateDailyRequestResSchema
} from '../entities/daily-request.entity'

export class CreateDailyRequestBodyInputDTO extends createZodDto(
  CreateDailyRequestBodyInputSchema
) {}

export class CreateDailyRequestResDTO extends createZodDto(CreateDailyRequestResSchema) {}

export class UpdateDailyRequestBodyInputDTO extends createZodDto(
  UpdateDailyRequestBodyInputSchema
) {}

export class UpdateDailyRequestResDTO extends createZodDto(UpdateDailyRequestResSchema) {}

export class GetDailyRequestParamsDTO extends createZodDto(GetParamsDailyRequestSchema) {}

export class GetDailyRequestDetailResDTO extends createZodDto(
  GetDailyRequestDetailResSchema
) {}

export class GetDailyRequestDetailwithAllLangResDTO extends createZodDto(
  GetDailyRequestDetailwithAllLangResSchema
) {}
