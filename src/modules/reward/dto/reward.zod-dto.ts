import { createZodDto } from 'nestjs-zod'
import {
  CreateRewardBodySchema,
  GetRewardDetailResSchema,
  GetRewardParamsSchema,
  UpdateRewardBodySchema
} from '../entities/reward.entity'

export class CreatedRewardBodyDTO extends createZodDto(CreateRewardBodySchema) {}

export class UpdateRewardBodyDTO extends createZodDto(UpdateRewardBodySchema) {}

export class GetRewardParamsDTO extends createZodDto(GetRewardParamsSchema) {}

export class GetRewardDetailResDTO extends createZodDto(GetRewardDetailResSchema) {}
