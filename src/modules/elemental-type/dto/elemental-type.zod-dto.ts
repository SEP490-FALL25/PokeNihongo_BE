import { createZodDto } from 'nestjs-zod'
import {
  CreateElementalTypeBodySchema,
  CreateElementalTypeResSchema,
  GetElementalTypeDetailResSchema,
  GetElementalTypeParamsSchema,
  UpdateElementalTypeBodySchema,
  UpdateElementalTypeResSchema
} from '../entities/elemental-type.entity'

export class CreateElementalTypeBodyDTO extends createZodDto(
  CreateElementalTypeBodySchema
) {}

export class CreateElementalTypeResDTO extends createZodDto(
  CreateElementalTypeResSchema
) {}

export class UpdateElementalTypeBodyDTO extends createZodDto(
  UpdateElementalTypeBodySchema
) {}

export class UpdateElementalTypeResDTO extends createZodDto(
  UpdateElementalTypeResSchema
) {}

export class GetElementalTypeParamsDTO extends createZodDto(
  GetElementalTypeParamsSchema
) {}

export class GetElementalTypeDetailResDTO extends createZodDto(
  GetElementalTypeDetailResSchema
) {}
