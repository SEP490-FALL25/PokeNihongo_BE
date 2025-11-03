import { createZodDto } from 'nestjs-zod'
import {
  CreateMatchRoundParticipantBodySchema,
  CreateMatchRoundParticipantResSchema,
  GetMatchRoundParticipantDetailResSchema,
  GetMatchRoundParticipantParamsSchema,
  UpdateMatchRoundParticipantBodySchema,
  UpdateMatchRoundParticipantResSchema,
  UpdateWithListItemResSchema
} from '../entities/match-round-participant.entity'

// Request DTOs
export class CreateMatchRoundParticipantBodyDTO extends createZodDto(
  CreateMatchRoundParticipantBodySchema
) {}

export class UpdateMatchRoundParticipantBodyDTO extends createZodDto(
  UpdateMatchRoundParticipantBodySchema
) {}

export class GetMatchRoundParticipantParamsDTO extends createZodDto(
  GetMatchRoundParticipantParamsSchema
) {}

// Response DTOs
export class CreateMatchRoundParticipantResDTO extends createZodDto(
  CreateMatchRoundParticipantResSchema
) {}
export class UpdateMatchRoundParticipantResDTO extends createZodDto(
  UpdateMatchRoundParticipantResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetMatchRoundParticipantDetailResDTO extends createZodDto(
  GetMatchRoundParticipantDetailResSchema
) {}
