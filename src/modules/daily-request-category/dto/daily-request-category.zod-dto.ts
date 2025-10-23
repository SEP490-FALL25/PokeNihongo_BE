import { createZodDto } from 'nestjs-zod'
import {
  CreateDailyRequestCategoryBodyInputSchema,
  CreateDailyRequestCategoryResSchema,
  GetDailyRequestCategoryDetailResSchema,
  GetParamsDailyRequestCategorySchema,
  UpdateDailyRequestCategoryBodyInputSchema,
  UpdateDailyRequestCategoryResSchema
} from '../entities/daily-request-category.entity'

export class CreateDailyRequestCategoryBodyInputDTO extends createZodDto(
  CreateDailyRequestCategoryBodyInputSchema
) {}

export class CreateDailyRequestCategoryResDTO extends createZodDto(
  CreateDailyRequestCategoryResSchema
) {}

export class UpdateDailyRequestCategoryBodyInputDTO extends createZodDto(
  UpdateDailyRequestCategoryBodyInputSchema
) {}

export class UpdateDailyRequestCategoryResDTO extends createZodDto(
  UpdateDailyRequestCategoryResSchema
) {}

export class GetDailyRequestCategoryParamsDTO extends createZodDto(
  GetParamsDailyRequestCategorySchema
) {}

export class GetDailyRequestCategoryDetailResDTO extends createZodDto(
  GetDailyRequestCategoryDetailResSchema
) {}
