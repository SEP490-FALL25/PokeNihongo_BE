import { createZodDto } from 'nestjs-zod'
import {
  AssignPokemonTypesBodySchema,
  CreatePokemonBodySchema,
  CreatePokemonFormDataSchema,
  CreatePokemonResSchema,
  GetPokemonDetailResSchema,
  GetPokemonParamsSchema,
  UpdatePokemonBodySchema,
  UpdatePokemonFormDataSchema,
  UpdatePokemonResSchema
} from '../entities/pokemon.entity'

// Request DTOs
export class CreatePokemonBodyDTO extends createZodDto(CreatePokemonBodySchema) {}
export class CreatePokemonFormDataDTO extends createZodDto(CreatePokemonFormDataSchema) {}
export class UpdatePokemonBodyDTO extends createZodDto(UpdatePokemonBodySchema) {}
export class UpdatePokemonFormDataDTO extends createZodDto(UpdatePokemonFormDataSchema) {}
export class GetPokemonParamsDTO extends createZodDto(GetPokemonParamsSchema) {}
export class AssignPokemonTypesBodyDTO extends createZodDto(
  AssignPokemonTypesBodySchema
) {}

// Response DTOs
export class CreatePokemonResDTO extends createZodDto(CreatePokemonResSchema) {}
export class UpdatePokemonResDTO extends createZodDto(UpdatePokemonResSchema) {}
export class GetPokemonDetailResDTO extends createZodDto(GetPokemonDetailResSchema) {}
