import { createZodDto } from 'nestjs-zod'
import {
  CreateGachaRollHistoryBodySchema,
  CreateGachaRollHistoryResSchema,
  GetGachaRollHistoryDetailResSchema,
  GetGachaRollHistoryParamsSchema,
  UpdateGachaRollHistoryBodySchema,
  UpdateGachaRollHistoryResSchema,
  UpdateWithListItemResSchema
} from '../entities/gacha-roll-history.entity'

// Request DTOs
export class CreateGachaRollHistoryBodyDTO extends createZodDto(
  CreateGachaRollHistoryBodySchema
) {}

export class UpdateGachaRollHistoryBodyDTO extends createZodDto(
  UpdateGachaRollHistoryBodySchema
) {}

export class GetGachaRollHistoryParamsDTO extends createZodDto(
  GetGachaRollHistoryParamsSchema
) {}

// Response DTOs
export class CreateGachaRollHistoryResDTO extends createZodDto(
  CreateGachaRollHistoryResSchema
) {}
export class UpdateGachaRollHistoryResDTO extends createZodDto(
  UpdateGachaRollHistoryResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetGachaRollHistoryDetailResDTO extends createZodDto(
  GetGachaRollHistoryDetailResSchema
) {}
