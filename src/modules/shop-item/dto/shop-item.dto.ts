import { createZodDto } from 'nestjs-zod'
import {
  CreateShopItemBodySchema,
  CreateShopItemResSchema,
  GetShopItemDetailResSchema,
  GetShopItemParamsSchema,
  UpdateShopItemBodySchema,
  UpdateShopItemResSchema
} from '../entities/shop-item.entity'

// Request DTOs
export class CreateShopItemBodyDTO extends createZodDto(CreateShopItemBodySchema) {}
export class UpdateShopItemBodyDTO extends createZodDto(UpdateShopItemBodySchema) {}
export class GetShopItemParamsDTO extends createZodDto(GetShopItemParamsSchema) {}

// Response DTOs
export class CreateShopItemResDTO extends createZodDto(CreateShopItemResSchema) {}
export class UpdateShopItemResDTO extends createZodDto(UpdateShopItemResSchema) {}
export class GetShopItemDetailResDTO extends createZodDto(GetShopItemDetailResSchema) {}
