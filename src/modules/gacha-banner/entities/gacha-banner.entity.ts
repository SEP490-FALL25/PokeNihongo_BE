import { GachaBannerStatus } from '@/common/constants/shop-banner.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { GachaBannerMessage } from '@/i18n/message-keys'
import { GachaItemRateSchema } from '@/modules/gacha-item-rate/entities/gacha-item-rate.entity'
import { GachaItemSchema } from '@/modules/gacha-item/entities/gacha-item.entity'
import { PokemonSchema } from '@/modules/pokemon/entities/pokemon.entity'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const GachaBannerSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  startDate: z.coerce.date().nullable(),
  endDate: z.coerce.date().nullable(),
  status: z
    .enum([
      GachaBannerStatus.ACTIVE,
      GachaBannerStatus.INACTIVE,
      GachaBannerStatus.EXPIRED,
      GachaBannerStatus.PREVIEW
    ])
    .default(GachaBannerStatus.PREVIEW),

  hardPity5Star: z.number().default(200),
  costRoll: z.number().default(100),
  amount5Star: z.number().default(1),
  amount4Star: z.number().default(3),
  amount3Star: z.number().default(6),
  amount2Star: z.number().default(8),
  amount1Star: z.number().default(10),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateGachaBannerBodyInputSchema = GachaBannerSchema.pick({
  startDate: true,
  endDate: true,
  status: true,
  hardPity5Star: true,
  costRoll: true,
  amount5Star: true,
  amount4Star: true,
  amount3Star: true,
  amount2Star: true,
  amount1Star: true
})
  .strict()
  .extend({
    nameTranslations: TranslationInputSchema
  })

export const CreateGachaBannerBodySchema = GachaBannerSchema.pick({
  nameKey: true,
  startDate: true,
  endDate: true,
  status: true,
  hardPity5Star: true,
  costRoll: true,
  amount5Star: true,
  amount4Star: true,
  amount3Star: true,
  amount2Star: true,
  amount1Star: true
}).strict()

export const CreateGachaBannerResSchema = z.object({
  statusCode: z.number(),
  data: GachaBannerSchema,
  message: z.string()
})

export const UpdateGachaBannerBodyInputSchema =
  CreateGachaBannerBodyInputSchema.partial().strict()

export const UpdateGachaBannerBodySchema = CreateGachaBannerBodySchema.partial().strict()

export const UpdateGachaBannerResSchema = CreateGachaBannerResSchema

export const GetGachaBannerParamsSchema = z
  .object({
    gachaBannerId: checkIdSchema(GachaBannerMessage.INVALID_DATA)
  })
  .strict()

export const GetGachaBannerDetailByUserSchema = GachaBannerSchema.extend({
  nameTranslation: z.string()
})

export const GetGachaBannerDetailResSchema = z.object({
  statusCode: z.number(),
  data: GachaBannerSchema.extend({
    nameTranslation: z.string(),
    items: z.array(
      GachaItemSchema.extend({
        gachaItemRate: GachaItemRateSchema.pick({ rate: true, starType: true }),
        pokemon: PokemonSchema.pick({
          id: true,
          pokedex_number: true,
          nameJp: true,
          nameTranslations: true,
          imageUrl: true,
          rarity: true
        })
      })
    )
  }),
  message: z.string()
})

export const GetGachaBannerByTodayResSchema = z.object({
  statusCode: z.number(),
  data: z.array(GetGachaBannerDetailByUserSchema),
  message: z.string()
})

export type GachaBannerType = z.infer<typeof GachaBannerSchema>
export type CreateGachaBannerBodyInputType = z.infer<
  typeof CreateGachaBannerBodyInputSchema
>
export type CreateGachaBannerBodyType = z.infer<typeof CreateGachaBannerBodySchema>
export type UpdateGachaBannerBodyInputType = z.infer<
  typeof UpdateGachaBannerBodyInputSchema
>
export type UpdateGachaBannerBodyType = z.infer<typeof UpdateGachaBannerBodySchema>
export type GetGachaBannerParamsType = z.infer<typeof GetGachaBannerParamsSchema>
export type GetGachaBannerDetailResType = z.infer<typeof GetGachaBannerDetailResSchema>

type GachaBannerFieldType = keyof z.infer<typeof GachaBannerSchema>
export const GACHA_BANNER_FIELDS = [
  ...Object.keys(GachaBannerSchema.shape),
  'nameTranslation'
] as GachaBannerFieldType[]
