import { createZodDto } from 'nestjs-zod'
import {
  CreateUserBodySchema,
  CreateUserResSchema,
  GetUserDetailResSchema,
  GetUserParamsSchema,
  GetUserStatsSeasonResSchema,
  SetMainPokemonBodySchema,
  UpdateUserBodySchema,
  UpdateUserResSchema
} from '../entities/user.entity'

export class CreateUserBodyDTO extends createZodDto(CreateUserBodySchema) {}

export class CreateUserResDTO extends createZodDto(CreateUserResSchema) {}

export class UpdateUserBodyDTO extends createZodDto(UpdateUserBodySchema) {}

export class UpdateUserResDTO extends createZodDto(UpdateUserResSchema) {}

export class GetUserParamsDTO extends createZodDto(GetUserParamsSchema) {}

export class GetUserDetailResDTO extends createZodDto(GetUserDetailResSchema) {}

export class SetMainPokemonBodyDTO extends createZodDto(SetMainPokemonBodySchema) {}

export class GetStatsUserSeasonResDTO extends createZodDto(GetUserStatsSeasonResSchema) {}
