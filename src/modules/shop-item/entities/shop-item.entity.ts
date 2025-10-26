import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base ShopItem Schema
export const ShopItemSchema = z.object({
  id: z.number(),
  shopBannerId: z.number(),
  pokemonId: z.number(),
  price: z.number().min(0),
  purchaseLimit: z.number().min(0).nullable(),
  purchasedCount: z.number().default(0),
  isActive: z.boolean(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Create Schema
export const CreateShopItemBodySchema = ShopItemSchema.pick({
  shopBannerId: true,
  pokemonId: true,
  price: true,
  purchaseLimit: true,
  isActive: true
}).strict()

export const CreateWithListItemBodySchema = z.object({
  items: z.array(CreateShopItemBodySchema).min(1, 'At least one item is required')
})

export const CreateShopItemResSchema = z.object({
  statusCode: z.number(),
  data: ShopItemSchema,
  message: z.string()
})

export const CreateWithListItemResSchema = z.object({
  statusCode: z.number(),
  data: z.array(ShopItemSchema),
  message: z.string()
})

// Update Schema
export const UpdateShopItemBodySchema = CreateShopItemBodySchema.extend({
  purchasedCount: z.number().min(0).optional()
})
  .partial()
  .strict()

export const UpdateShopItemResSchema = CreateShopItemResSchema

export const UpdateShopItemWithIdSchema = z
  .object({
    id: z.number().int().positive(),
    shopBannerId: z.number().optional(),
    pokemonId: z.number().optional(),
    price: z.number().min(0).optional(),
    purchaseLimit: z.number().min(0).nullable().optional(),
    isActive: z.boolean().optional(),
    purchasedCount: z.number().min(0).optional()
  })
  .strict()

export const UpdateWithListItemBodySchema = z.object({
  items: z.array(UpdateShopItemWithIdSchema).min(1)
})

export const UpdateWithListItemResSchema = z.object({
  statusCode: z.number(),
  data: z.array(ShopItemSchema),
  message: z.string()
})

export const GetRamdomAmountShopItemBodySchema = z
  .object({
    amount: z.number().min(1).optional().nullable(),
    shopBannerId: z.number()
  })
  .strict()

export const GetRandomShopItemResSchema = z.object({
  statusCode: z.number(),
  data: z.array(
    z.object({
      shopBannerId: z.number(),
      pokemonId: z.number(),
      price: z.number(),
      purchaseLimit: z.number(),
      isActive: z.boolean(),
      // Trả kèm thông tin Pokemon
      pokemon: PokemonSchema
    })
  ),
  message: z.string()
})

// Query Schema
export const GetShopItemParamsSchema = z.object({
  shopItemId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetShopItemDetailSchema = ShopItemSchema.extend({
  // Use lazy to break circular dependency with ShopBannerSchema
  shopBanner: z
    .lazy(() => require('../../shop-banner/entities/shop-banner.entity').ShopBannerSchema)
    .optional(),
  pokemon: PokemonSchema.optional()
})

export const GetShopItemDetailResSchema = z.object({
  statusCode: z.number(),
  data: GetShopItemDetailSchema,
  message: z.string()
})

// Type exports
export type ShopItemType = z.infer<typeof ShopItemSchema>
export type CreateShopItemBodyType = z.infer<typeof CreateShopItemBodySchema>
export type CreateWithListItemBodyType = z.infer<typeof CreateWithListItemBodySchema>
export type UpdateShopItemBodyType = z.infer<typeof UpdateShopItemBodySchema>
export type UpdateShopItemWithIdType = z.infer<typeof UpdateShopItemWithIdSchema>
export type UpdateWithListItemBodyType = z.infer<typeof UpdateWithListItemBodySchema>
export type GetShopItemParamsType = z.infer<typeof GetShopItemParamsSchema>
export type GetShopItemDetailType = z.infer<typeof GetShopItemDetailSchema>
export type GetRamdomAmountShopItemBodyType = z.infer<
  typeof GetRamdomAmountShopItemBodySchema
>
// Field for query
export type ShopItemFieldType = keyof z.infer<typeof ShopItemSchema>
export const SHOP_ITEM_FIELDS = Object.keys(ShopItemSchema.shape) as ShopItemFieldType[]
