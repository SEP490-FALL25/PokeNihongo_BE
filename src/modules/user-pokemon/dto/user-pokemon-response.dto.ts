import { PaginationMetaSchema } from '@/shared/models/response.model'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

const PokemonWithUserInfoSchema = z.object({
    id: z.number(),
    pokedex_number: z.number(),
    nameJp: z.string(),
    nameTranslations: z.record(z.string()),
    description: z.string(),
    conditionLevel: z.number(),
    isStarted: z.boolean(),
    imageUrl: z.string(),
    rarity: z.string(),
    createdById: z.number().nullable(),
    updatedById: z.number().nullable(),
    deletedById: z.number().nullable(),
    deletedAt: z.date().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    types: z.array(z.any()),
    weaknesses: z.array(z.any()),
    userPokemon: z.boolean()
})

const PokemonListWithUserDataSchema = z.object({
    results: z.array(PokemonWithUserInfoSchema),
    pagination: PaginationMetaSchema,
    ownershipPercentage: z.number(),
    userPokemonsCount: z.number(),
    totalPokemons: z.number()
})

export const PokemonListWithUserResponseSchema = z.object({
    statusCode: z.number().default(200),
    message: z.string(),
    data: PokemonListWithUserDataSchema
})

export class PokemonListWithUserResponseDTO extends createZodDto(PokemonListWithUserResponseSchema) { }
