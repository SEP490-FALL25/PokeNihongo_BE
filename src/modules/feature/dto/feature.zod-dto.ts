import { createZodDto } from 'nestjs-zod'
import {
  CreateFeatureBodyInputSchema,
  CreateFeatureResSchema,
  GetFeatureDetailResSchema,
  GetFeatureDetailWithAllLangResSchema,
  GetFeatureParamsSchema,
  UpdateFeatureBodyInputSchema,
  UpdateFeatureResSchema
} from '../entities/feature.entity'

export class CreatedFeatureBodyInputDTO extends createZodDto(
  CreateFeatureBodyInputSchema
) {}

export class CreateFeatureResDTO extends createZodDto(CreateFeatureResSchema) {}

export class UpdateFeatureBodyInputDTO extends createZodDto(
  UpdateFeatureBodyInputSchema
) {}

export class UpdateFeatureResDTO extends createZodDto(UpdateFeatureResSchema) {}

export class GetFeatureParamsDTO extends createZodDto(GetFeatureParamsSchema) {}

export class GetFeatureDetailResDTO extends createZodDto(GetFeatureDetailResSchema) {}

export class GetFeatureDetailWithAllLangResDTO extends createZodDto(
  GetFeatureDetailWithAllLangResSchema
) {}
