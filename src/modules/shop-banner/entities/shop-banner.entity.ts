import { checkIdSchema } from '@/common/utils/id.validation'
import { ShopBannerMessage } from '@/i18n/message-keys'
import { ShopItemSchema } from '@/modules/shop-item/entities/shop-item.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const ShopBannerSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  isActive: z.boolean(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateShopBannerBodyInputSchema = ShopBannerSchema.pick({
  startDate: true,
  endDate: true,
  isActive: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema
  })

export const CreateShopBannerBodySchema = ShopBannerSchema.pick({
  nameKey: true,
  startDate: true,
  endDate: true,
  isActive: true
}).strict()

export const CreateShopBannerResSchema = z.object({
  statusCode: z.number(),
  data: ShopBannerSchema,
  message: z.string()
})

export const UpdateShopBannerBodyInputSchema =
  CreateShopBannerBodyInputSchema.partial().strict()

export const UpdateShopBannerBodySchema = CreateShopBannerBodySchema.partial().strict()

export const UpdateShopBannerResSchema = CreateShopBannerResSchema

export const GetShopBannerParamsSchema = z
  .object({
    shopBannerId: checkIdSchema(ShopBannerMessage.INVALID_DATA)
  })
  .strict()

export const GetShopBannerDetailResSchema = z.object({
  statusCode: z.number(),
  data: ShopBannerSchema.extend({
    nameTranslation: z.string(),
    shopItems: z.array(
      z.object({
        ...ShopItemSchema.shape
      })
    )
  }),
  message: z.string()
})

export type ShopBannerType = z.infer<typeof ShopBannerSchema>
export type CreateShopBannerBodyInputType = z.infer<
  typeof CreateShopBannerBodyInputSchema
>
export type CreateShopBannerBodyType = z.infer<typeof CreateShopBannerBodySchema>
export type UpdateShopBannerBodyInputType = z.infer<
  typeof UpdateShopBannerBodyInputSchema
>
export type UpdateShopBannerBodyType = z.infer<typeof UpdateShopBannerBodySchema>
export type GetShopBannerParamsType = z.infer<typeof GetShopBannerParamsSchema>
export type GetShopBannerDetailResType = z.infer<typeof GetShopBannerDetailResSchema>

type ShopBannerFieldType = keyof z.infer<typeof ShopBannerSchema>
export const REWARD_FIELDS = [
  ...Object.keys(ShopBannerSchema.shape),
  'nameTranslation'
] as ShopBannerFieldType[]
