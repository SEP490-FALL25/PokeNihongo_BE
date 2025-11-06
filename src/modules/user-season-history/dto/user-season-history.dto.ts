import { createZodDto } from 'nestjs-zod'
import {
  CreateUserSeasonHistoryBodySchema,
  CreateUserSeasonHistoryResSchema,
  GetUserSeasonHistoryDetailResSchema,
  GetUserSeasonHistoryParamsSchema,
  UpdateUserSeasonHistoryBodySchema,
  UpdateUserSeasonHistoryResSchema,
  UpdateWithListItemResSchema
} from '../entities/user-season-history.entity'

// Request DTOs
export class CreateUserSeasonHistoryBodyDTO extends createZodDto(
  CreateUserSeasonHistoryBodySchema
) {}

export class UpdateUserSeasonHistoryBodyDTO extends createZodDto(
  UpdateUserSeasonHistoryBodySchema
) {}

export class GetUserSeasonHistoryParamsDTO extends createZodDto(
  GetUserSeasonHistoryParamsSchema
) {}

// Response DTOs
export class CreateUserSeasonHistoryResDTO extends createZodDto(
  CreateUserSeasonHistoryResSchema
) {}
export class UpdateUserSeasonHistoryResDTO extends createZodDto(
  UpdateUserSeasonHistoryResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetUserSeasonHistoryDetailResDTO extends createZodDto(
  GetUserSeasonHistoryDetailResSchema
) {}
