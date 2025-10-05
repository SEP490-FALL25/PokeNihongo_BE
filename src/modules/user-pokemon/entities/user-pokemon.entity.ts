import { USER_POKEMON_MESSAGE } from '@/common/constants/message'
import { checkIdSchema } from '@/common/utils/id.validation'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base UserPokemon Schema
export const UserPokemonSchema = z.object({
  id: z.number(),
  userId: z.number(),
  pokemonId: z.number(),
  levelId: z.number(),
  nickname: z.string().max(50, 'Nickname không được quá 50 ký tự').nullable(),
  exp: z.number().min(0, 'EXP không được âm').default(0),

  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable()
})

// Create Schema
export const CreateUserPokemonBodySchema = z
  .object({
    pokemonId: z.number().min(1, 'Pokemon ID không hợp lệ'),
    levelId: z.number().min(1, 'Level ID không hợp lệ').optional(),
    nickname: z
      .string()
      .max(50, 'Nickname không được quá 50 ký tự')
      .nullable()
      .optional(),
    exp: z.number().min(0, 'EXP không được âm').default(0).optional()
  })
  .strict()

export const CreateUserPokemonResSchema = z.object({
  statusCode: z.number(),
  data: UserPokemonSchema,
  message: z.string()
})

// Update Schema
export const UpdateUserPokemonBodySchema = z
  .object({
    levelId: z.number().min(1, 'Level ID không hợp lệ').optional(),
    nickname: z
      .string()
      .max(50, 'Nickname không được quá 50 ký tự')
      .nullable()
      .optional(),
    exp: z.number().min(0, 'EXP không được âm').optional()
  })
  .strict()

export const UpdateUserPokemonResSchema = CreateUserPokemonResSchema

// Query Schema
export const GetUserPokemonParamsSchema = z.object({
  userPokemonId: checkIdSchema(USER_POKEMON_MESSAGE.INVALID_ID)
})

export const GetUserPokemonDetailResSchema = z.object({
  statusCode: z.number(),
  data: z.object({
    ...UserPokemonSchema.shape,
    user: z
      .object({
        id: z.number(),
        name: z.string(),
        email: z.string()
      })
      .optional(),
    pokemon: z
      .object({
        id: z.number(),
        pokedex_number: z.number(),
        nameJp: z.string(),
        nameTranslations: z.any(),
        description: z.string().nullable(),
        imageUrl: z.string().nullable(),
        rarity: z.string(),
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
      })
      .optional(),
    level: z
      .object({
        id: z.number(),
        levelNumber: z.number(),
        requiredExp: z.number(),
        levelType: z.string()
      })
      .optional()
  }),
  message: z.string()
})

// Add EXP Schema
export const AddExpBodySchema = z
  .object({
    expAmount: z.number().min(1, 'EXP amount phải lớn hơn 0')
  })
  .strict()

// Type exports
export type UserPokemonType = z.infer<typeof UserPokemonSchema>
export type CreateUserPokemonBodyType = z.infer<typeof CreateUserPokemonBodySchema>
export type UpdateUserPokemonBodyType = z.infer<typeof UpdateUserPokemonBodySchema>
export type GetUserPokemonParamsType = z.infer<typeof GetUserPokemonParamsSchema>
export type GetUserPokemonDetailResType = z.infer<typeof GetUserPokemonDetailResSchema>
export type AddExpBodyType = z.infer<typeof AddExpBodySchema>

// Field for query
export type UserPokemonFieldType = keyof z.infer<typeof UserPokemonSchema>
export const USER_POKEMON_FIELDS = Object.keys(
  UserPokemonSchema.shape
) as UserPokemonFieldType[]
