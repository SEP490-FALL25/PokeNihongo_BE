import { POKEMON_MESSAGE } from '@/common/constants/message'
import { RarityPokemon } from '@/common/constants/pokemon.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base Pokemon Schema
export const PokemonSchema = z.object({
  id: z.number(),
  pokedex_number: z.number().min(1, 'Pokedex number phải lớn hơn 0'),
  nameJp: z.string().min(1, 'Tên tiếng Nhật không được để trống'),
  nameTranslations: z
    .any()
    .refine(
      (data) => data && typeof data === 'object' && data.en && data.ja && data.vi,
      'Name translations phải có đầy đủ en, ja, vi'
    ),
  description: z.string().nullable(),
  conditionLevel: z.number().min(1).nullable(),
  nextPokemonsId: z.array(z.number()).default([]).optional(),
  isStarted: z.boolean().default(false),
  imageUrl: z.string().url().nullable(),
  rarity: z
    .enum([
      RarityPokemon.COMMON,
      RarityPokemon.UNCOMMON,
      RarityPokemon.RARE,
      RarityPokemon.EPIC,
      RarityPokemon.LEGENDARY
    ])
    .default(RarityPokemon.COMMON),

  // Audit fields
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable()
})

// Create Schema
export const CreatePokemonBodySchema = PokemonSchema.pick({
  pokedex_number: true,
  nameJp: true,
  nameTranslations: true,
  description: true,
  conditionLevel: true,
  nextPokemonsId: true,
  isStarted: true,
  imageUrl: true,
  rarity: true
})
  .extend({
    conditionLevel: PokemonSchema.shape.conditionLevel.optional(),
    imageUrl: PokemonSchema.shape.imageUrl.optional(),
    // Thêm field cho elemental types
    typeIds: z
      .array(z.number())
      .min(1, 'Pokemon phải có ít nhất 1 type')
      .max(2, 'Pokemon tối đa 2 types')
  })
  .strict()
  .refine(
    (data) => {
      // Nếu có nextPokemonsId thì phải có conditionLevel
      if (data.nextPokemonsId && data.nextPokemonsId.length > 0 && !data.conditionLevel) {
        return false
      }
      return true
    },
    {
      message: 'Nếu có evolution thì phải có condition level',
      path: ['conditionLevel']
    }
  )

// Form-data Schema (tất cả field đều là string từ form-data)
export const CreatePokemonFormDataSchema = z
  .object({
    pokedex_number: z.string().transform((val) => parseInt(val, 10)),
    nameJp: z.string().min(1, 'Tên tiếng Nhật không được để trống'),
    nameTranslations: z.string().transform((val) => {
      try {
        const parsed = JSON.parse(val)
        if (parsed && typeof parsed === 'object' && parsed.en && parsed.ja && parsed.vi) {
          return parsed
        }
        throw new Error('Invalid format')
      } catch {
        throw new Error('Name translations phải có đầy đủ en, ja, vi')
      }
    }),
    description: z
      .string()
      .transform((val) => val || null)
      .optional(),
    conditionLevel: z
      .string()
      .transform((val) => (val ? parseInt(val, 10) : null))
      .optional(),
    nextPokemonsId: z
      .string()
      .transform((val) => {
        if (!val) return []
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'number')) {
            return parsed
          }
          throw new Error('Invalid format')
        } catch {
          throw new Error('nextPokemons phải là array số nguyên')
        }
      })
      .optional(),
    isStarted: z
      .string()
      .transform((val) => val === 'true' || val === '1')
      .default('false'),
    imageUrl: z.string().optional().nullable(),
    rarity: z
      .enum([
        RarityPokemon.COMMON,
        RarityPokemon.UNCOMMON,
        RarityPokemon.RARE,
        RarityPokemon.EPIC,
        RarityPokemon.LEGENDARY
      ])
      .default(RarityPokemon.COMMON),
    // Thêm field cho elemental types (từ form-data sẽ là string JSON array)
    typeIds: z.string().transform((val) => {
      try {
        const parsed = JSON.parse(val)
        if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'number')) {
          if (parsed.length < 1) throw new Error('Pokemon phải có ít nhất 1 type')
          if (parsed.length > 2) throw new Error('Pokemon tối đa 2 types')
          return parsed
        }
        throw new Error('Invalid format')
      } catch {
        throw new Error('typeIds phải là array số nguyên với 1-2 phần tử')
      }
    })
  })
  .strict()
  .refine(
    (data) => {
      // Nếu có nextPokemons thì phải có conditionLevel
      if (data.nextPokemonsId && data.nextPokemonsId.length > 0 && !data.conditionLevel) {
        return false
      }
      return true
    },
    {
      message: 'Nếu có evolution thì phải có condition level',
      path: ['conditionLevel']
    }
  )

export const CreatePokemonResSchema = z.object({
  statusCode: z.number(),
  data: PokemonSchema.omit({ nextPokemonsId: true }),
  message: z.string()
})

// Update Schema
export const UpdatePokemonBodySchema = PokemonSchema.pick({
  pokedex_number: true,
  nameJp: true,
  nameTranslations: true,
  description: true,
  conditionLevel: true,
  nextPokemonsId: true,
  isStarted: true,
  imageUrl: true,
  rarity: true
})
  .extend({
    // Thêm field cho elemental types
    typeIds: z
      .array(z.number())
      .min(1, 'Pokemon phải có ít nhất 1 type')
      .max(2, 'Pokemon tối đa 2 types')
      .optional()
  })
  .partial()
  .strict()
  .refine(
    (data) => {
      if (data.nextPokemonsId && data.nextPokemonsId.length > 0 && !data.conditionLevel) {
        return false
      }
      return true
    },
    {
      message: 'Nếu có evolution thì phải có condition level',
      path: ['conditionLevel']
    }
  )

// Form-data Schema cho Update
export const UpdatePokemonFormDataSchema = z
  .object({
    pokedex_number: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    nameJp: z.string().min(1, 'Tên tiếng Nhật không được để trống').optional(),
    nameTranslations: z
      .string()
      .transform((val) => {
        try {
          const parsed = JSON.parse(val)
          if (
            parsed &&
            typeof parsed === 'object' &&
            parsed.en &&
            parsed.ja &&
            parsed.vi
          ) {
            return parsed
          }
          throw new Error('Invalid format')
        } catch {
          throw new Error('Name translations phải có đầy đủ en, ja, vi')
        }
      })
      .optional(),
    description: z
      .string()
      .transform((val) => val || null)
      .optional(),
    conditionLevel: z
      .string()
      .transform((val) => (val ? parseInt(val, 10) : null))
      .optional(),
    nextPokemonsId: z
      .string()
      .transform((val) => {
        if (!val) return []
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'number')) {
            return parsed
          }
          throw new Error('Invalid format')
        } catch {
          throw new Error('nextPokemons phải là array số nguyên')
        }
      })
      .optional(),
    isStarted: z
      .string()
      .transform((val) => val === 'true' || val === '1')
      .optional(),
    imageUrl: z.string().optional().nullable(),
    rarity: z
      .enum([
        RarityPokemon.COMMON,
        RarityPokemon.UNCOMMON,
        RarityPokemon.RARE,
        RarityPokemon.EPIC,
        RarityPokemon.LEGENDARY
      ])
      .optional(),
    // Thêm field cho elemental types (từ form-data sẽ là string JSON array)
    typeIds: z
      .string()
      .transform((val) => {
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'number')) {
            if (parsed.length < 1) throw new Error('Pokemon phải có ít nhất 1 type')
            if (parsed.length > 2) throw new Error('Pokemon tối đa 2 types')
            return parsed
          }
          throw new Error('Invalid format')
        } catch {
          throw new Error('typeIds phải là array số nguyên với 1-2 phần tử')
        }
      })
      .optional()
  })
  .strict()
  .refine(
    (data) => {
      // Nếu có nextPokemons thì phải có conditionLevel
      if (data.nextPokemonsId && data.nextPokemonsId.length > 0 && !data.conditionLevel) {
        return false
      }
      return true
    },
    {
      message: 'Nếu có evolution thì phải có condition level',
      path: ['conditionLevel']
    }
  )

export const UpdatePokemonResSchema = CreatePokemonResSchema

// Query Schema
export const GetPokemonParamsSchema = z.object({
  pokemonId: checkIdSchema(POKEMON_MESSAGE.INVALID_ID)
})

export const GetPokemonDetailResSchema = z.object({
  statusCode: z.number(),
  data: PokemonSchema.omit({ nextPokemonsId: true }).extend({
    types: z
      .array(
        z.object({
          id: z.number(),
          type_name: z.string(),
          display_name: z.any(),
          color_hex: z.string()
        })
      )
      .optional(),
    nextPokemons: z
      .array(
        PokemonSchema.omit({
          nextPokemonsId: true,
          createdById: true,
          updatedById: true,
          deletedById: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true
        })
      )
      .optional(),
    previousPokemons: z
      .array(
        PokemonSchema.omit({
          nextPokemonsId: true,
          createdById: true,
          updatedById: true,
          deletedById: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true
        })
      )
      .optional(),
    weaknesses: z
      .array(
        z.object({
          id: z.number(),
          type_name: z.string(),
          display_name: z.any(),
          color_hex: z.string(),
          effectiveness_multiplier: z.number()
        })
      )
      .optional()
  }),
  message: z.string()
})

// Pokemon Weakness Response Schema
export const GetPokemonWeaknessResSchema = z.object({
  statusCode: z.number(),
  data: z.object({
    pokemon: z.object({
      id: z.number(),
      nameJp: z.string(),
      nameTranslations: z.any(),
      types: z
        .array(
          z.object({
            id: z.number(),
            type_name: z.string(),
            display_name: z.any(),
            color_hex: z.string()
          })
        )
        .optional()
    }),
    weaknesses: z.array(
      z.object({
        id: z.number(),
        type_name: z.string(),
        display_name: z.any(),
        color_hex: z.string(),
        effectiveness_multiplier: z.number()
      })
    )
  }),
  message: z.string()
})

// Assign Types Schema
export const AssignPokemonTypesBodySchema = z
  .object({
    typeIds: z
      .array(z.number().min(1))
      .min(1, 'Phải có ít nhất 1 type')
      .max(2, 'Tối đa 2 types')
  })
  .strict()

// Evolution Schema
export const GetEvolutionOptionsResSchema = z.object({
  statusCode: z.number(),
  data: z.array(
    z.object({
      id: z.number(),
      pokedex_number: z.number(),
      nameJp: z.string(),
      nameTranslations: z.any(),
      description: z.string().nullable(),
      imageUrl: z.string().nullable(),
      rarity: z.string()
    })
  ),
  message: z.string()
})

// Type exports
export type PokemonType = z.infer<typeof PokemonSchema>
export type CreatePokemonBodyType = z.infer<typeof CreatePokemonBodySchema>
export type CreatePokemonFormDataType = z.infer<typeof CreatePokemonFormDataSchema>
export type UpdatePokemonBodyType = z.infer<typeof UpdatePokemonBodySchema>
export type UpdatePokemonFormDataType = z.infer<typeof UpdatePokemonFormDataSchema>
export type GetPokemonParamsType = z.infer<typeof GetPokemonParamsSchema>
export type GetPokemonDetailResType = z.infer<typeof GetPokemonDetailResSchema>
export type GetPokemonWeaknessResType = z.infer<typeof GetPokemonWeaknessResSchema>
export type AssignPokemonTypesBodyType = z.infer<typeof AssignPokemonTypesBodySchema>
export type GetEvolutionOptionsResType = z.infer<typeof GetEvolutionOptionsResSchema>

// Field for query
export type PokemonFieldType = keyof z.infer<typeof PokemonSchema>
export const POKEMON_FIELDS = Object.keys(PokemonSchema.shape) as PokemonFieldType[]
