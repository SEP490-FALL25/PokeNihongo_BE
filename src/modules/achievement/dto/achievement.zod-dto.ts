import { createZodDto } from 'nestjs-zod'
import {
  CreateAchievementBodyInputSchema,
  CreateAchievementResSchema,
  GetAchievementDetailResSchema,
  GetAchievementParamsSchema,
  UpdateAchievementBodyInputSchema,
  UpdateAchievementResSchema
} from '../entities/achievement.entity'

export class CreateAchievementBodyInputDTO extends createZodDto(
  CreateAchievementBodyInputSchema
) {}

export class CreateAchievementResDTO extends createZodDto(CreateAchievementResSchema) {}

export class UpdateAchievementBodyInputDTO extends createZodDto(
  UpdateAchievementBodyInputSchema
) {}

export class UpdateAchievementResDTO extends createZodDto(UpdateAchievementResSchema) {}

export class GetAchievementParamsDTO extends createZodDto(GetAchievementParamsSchema) {}

export class GetAchievementDetailResDTO extends createZodDto(
  GetAchievementDetailResSchema
) {}
