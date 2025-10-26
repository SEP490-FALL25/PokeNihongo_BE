import { createZodDto } from 'nestjs-zod'
import {
  CreateRewardBodyInputSchema,
  CreateRewardResSchema,
  GetRewardDetailResSchema,
  GetRewardDetailWithAllLangResSchema,
  GetRewardParamsSchema,
  UpdateRewardBodyInputSchema,
  UpdateRewardResSchema
} from '../entities/reward.entity'

export class CreatedRewardBodyInputDTO extends createZodDto(
  CreateRewardBodyInputSchema
) {}

export class CreateRewardResDTO extends createZodDto(CreateRewardResSchema) {}

export class UpdateRewardBodyInputDTO extends createZodDto(UpdateRewardBodyInputSchema) {}

export class UpdateRewardResDTO extends createZodDto(UpdateRewardResSchema) {}

export class GetRewardParamsDTO extends createZodDto(GetRewardParamsSchema) {}

export class GetRewardDetailResDTO extends createZodDto(GetRewardDetailResSchema) {}

export class GetRewardDetailWithAllLangResDTO extends createZodDto(
  GetRewardDetailWithAllLangResSchema
) {}
