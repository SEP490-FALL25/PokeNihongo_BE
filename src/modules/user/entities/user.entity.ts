import { USER_MESSAGE } from '@/common/constants/message'
import { checkIdSchema } from '@/common/utils/id.validation'
import { LevelSchema } from '@/modules/level/entities/level.entity'
import { RoleSchema } from '@/shared/models/shared-role.model'
import { UserSchema } from '@/shared/models/shared-user.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const CreateUserBodySchema = UserSchema.pick({
  email: true,
  name: true,
  roleId: true,
  phoneNumber: true,
  avatar: true
})
  .extend({
    avatar: z.string().url().optional()
  })
  .strict()

export const CreateUserResSchema = z.object({
  statusCode: z.number(),
  data: UserSchema.omit({ password: true }), // Không trả về password
  message: z.string()
})

export const UpdateUserBodySchema = UserSchema.pick({
  name: true,
  phoneNumber: true,
  avatar: true,
  status: true,
  roleId: true,
  levelId: true,
  password: true
})
  .partial()
  .strict()

export const UpdateUserResSchema = CreateUserResSchema

export const GetUserParamsSchema = z
  .object({
    userId: checkIdSchema(USER_MESSAGE.INVALID_DATA)
  })
  .strict()

export const UserWithoutPasswordSchema = z.object({
  ...UserSchema.omit({ password: true }).shape, // Không trả về password
  role: RoleSchema.omit({
    createdById: true,
    updatedById: true,
    deletedById: true
  })
    .nullable()
    .optional(),
  level: LevelSchema.omit({
    createdById: true,
    updatedById: true,
    deletedById: true
  })
    .nullable()
    .optional()
})

export const GetUserDetailResSchema = z.object({
  statusCode: z.number(),
  data: UserWithoutPasswordSchema,
  message: z.string()
})

export const SetMainPokemonBodySchema = z
  .object({
    pokemonId: z.number().min(1, 'Pokemon ID không hợp lệ')
  })
  .strict()

export type UserType = z.infer<typeof UserSchema>
export type CreateUserBodyType = z.infer<typeof CreateUserBodySchema>
export type UpdateUserBodyType = z.infer<typeof UpdateUserBodySchema>
export type GetUserParamsType = z.infer<typeof GetUserParamsSchema>
export type GetUserDetailResType = z.infer<typeof GetUserDetailResSchema>
export type UserWithoutPasswordType = z.infer<typeof UserWithoutPasswordSchema>
export type SetMainPokemonBodyType = z.infer<typeof SetMainPokemonBodySchema>

type UserFieldType = keyof z.infer<typeof UserSchema>
export const USER_FIELDS = Object.keys(UserSchema.shape) as UserFieldType[]
