import { createZodDto } from 'nestjs-zod'
import {
  CreateUserDailyRequestBodySchema,
  CreateUserDailyRequestResSchema,
  GetUserDailyRequestDetailResSchema,
  GetUserDailyRequestParamsSchema,
  UpdateUserDailyRequestBodySchema,
  UpdateUserDailyRequestResSchema
} from '../entities/user-daily-request.entity'

export class CreatedUserDailyRequestBodyDTO extends createZodDto(
  CreateUserDailyRequestBodySchema
) {}

export class CreateUserDailyRequestResDTO extends createZodDto(
  CreateUserDailyRequestResSchema
) {}

export class UpdateUserDailyRequestBodyDTO extends createZodDto(
  UpdateUserDailyRequestBodySchema
) {}

export class UpdateUserDailyRequestResDTO extends createZodDto(
  UpdateUserDailyRequestResSchema
) {}

export class GetUserDailyRequestParamsDTO extends createZodDto(
  GetUserDailyRequestParamsSchema
) {}

export class GetUserDailyRequestDetailResDTO extends createZodDto(
  GetUserDailyRequestDetailResSchema
) {}
