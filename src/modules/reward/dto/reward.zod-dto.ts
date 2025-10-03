import { createZodDto } from 'nestjs-zod'
import {
  CreateRewardBodySchema,
  CreateRewardResSchema,
  GetRewardDetailResSchema,
  GetRewardParamsSchema,
  UpdateRewardBodySchema,
  UpdateRewardResSchema
} from '../entities/reward.entity'

export class CreatedRewardBodyDTO extends createZodDto(CreateRewardBodySchema) {}

export class CreateRewardResDTO extends createZodDto(CreateRewardResSchema) {}

export class UpdateRewardBodyDTO extends createZodDto(UpdateRewardBodySchema) {}

export class UpdateRewardResDTO extends createZodDto(UpdateRewardResSchema) {}

export class GetRewardParamsDTO extends createZodDto(GetRewardParamsSchema) {}

export class GetRewardDetailResDTO extends createZodDto(GetRewardDetailResSchema) {}
