import { createZodDto } from 'nestjs-zod'
import {
  CreateGachaBannerBodyInputSchema,
  CreateGachaBannerResSchema,
  GetGachaBannerByTodayResSchema,
  GetGachaBannerDetailResSchema,
  GetGachaBannerParamsSchema,
  UpdateGachaBannerBodyInputSchema,
  UpdateGachaBannerResSchema
} from '../entities/gacha-banner.entity'

export class CreatedGachaBannerBodyInputDTO extends createZodDto(
  CreateGachaBannerBodyInputSchema
) {}

export class CreateGachaBannerResDTO extends createZodDto(CreateGachaBannerResSchema) {}

export class UpdateGachaBannerBodyInputDTO extends createZodDto(
  UpdateGachaBannerBodyInputSchema
) {}

export class UpdateGachaBannerResDTO extends createZodDto(UpdateGachaBannerResSchema) {}

export class GetGachaBannerParamsDTO extends createZodDto(GetGachaBannerParamsSchema) {}

export class GetGachaBannerDetailResDTO extends createZodDto(
  GetGachaBannerDetailResSchema
) {}

export class GetGachaBannerByTodayResDTO extends createZodDto(
  GetGachaBannerByTodayResSchema
) {}
