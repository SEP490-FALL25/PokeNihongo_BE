import { createZodDto } from 'nestjs-zod'
import {
  CreateShopBannerBodyInputSchema,
  CreateShopBannerResSchema,
  GetShopBannerByTodayResSchema,
  GetShopBannerDetailResSchema,
  GetShopBannerParamsSchema,
  UpdateShopBannerBodyInputSchema,
  UpdateShopBannerResSchema
} from '../entities/shop-banner.entity'

export class CreatedShopBannerBodyInputDTO extends createZodDto(
  CreateShopBannerBodyInputSchema
) {}

export class CreateShopBannerResDTO extends createZodDto(CreateShopBannerResSchema) {}

export class UpdateShopBannerBodyInputDTO extends createZodDto(
  UpdateShopBannerBodyInputSchema
) {}

export class UpdateShopBannerResDTO extends createZodDto(UpdateShopBannerResSchema) {}

export class GetShopBannerParamsDTO extends createZodDto(GetShopBannerParamsSchema) {}

export class GetShopBannerDetailResDTO extends createZodDto(
  GetShopBannerDetailResSchema
) {}

export class GetShopBannerByTodayResDTO extends createZodDto(
  GetShopBannerByTodayResSchema
) {}
