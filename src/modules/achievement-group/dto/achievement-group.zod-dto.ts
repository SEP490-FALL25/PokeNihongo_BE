import { createZodDto } from 'nestjs-zod'
import {
  CreateAchievementGroupBodyInputSchema,
  CreateAchievementGroupResSchema,
  GetAchievementGroupDetailResSchema,
  GetAchievementGroupParamsSchema,
  UpdateAchievementGroupBodyInputSchema,
  UpdateAchievementGroupResSchema
} from '../entities/achievement-group.entity'

export class CreateAchievementGroupBodyInputDTO extends createZodDto(
  CreateAchievementGroupBodyInputSchema
) {}

export class CreateAchievementGroupResDTO extends createZodDto(
  CreateAchievementGroupResSchema
) {}

export class UpdateAchievementGroupBodyInputDTO extends createZodDto(
  UpdateAchievementGroupBodyInputSchema
) {}

export class UpdateAchievementGroupResDTO extends createZodDto(
  UpdateAchievementGroupResSchema
) {}

export class GetAchievementGroupParamsDTO extends createZodDto(
  GetAchievementGroupParamsSchema
) {}

export class GetAchievementGroupDetailResDTO extends createZodDto(
  GetAchievementGroupDetailResSchema
) {}
