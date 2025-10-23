import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()
export const DailyRequestCategorySchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  isStreat: z.boolean().default(false),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateDailyRequestCategoryBodyInputSchema = DailyRequestCategorySchema.pick({
  isStreat: true
})
  .extend({
    nameTranslations: TranslationInputSchema
  })
  .strict()

export const CreateDailyRequestCategoryBodySchema = DailyRequestCategorySchema.pick({
  nameKey: true,
  isStreat: true
}).strict()

export const CreateDailyRequestCategoryResSchema = z.object({
  statusCode: z.number(),
  data: DailyRequestCategorySchema,
  message: z.string()
})

export const UpdateDailyRequestCategoryBodyInputSchema =
  CreateDailyRequestCategoryBodyInputSchema.partial().strict()

export const UpdateDailyRequestCategoryBodySchema =
  CreateDailyRequestCategoryBodySchema.partial().strict()

export const UpdateDailyRequestCategoryResSchema = CreateDailyRequestCategoryResSchema

export const GetParamsDailyRequestCategorySchema = z.object({
  dailyRequestCategoryId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
})

export const GetDailyRequestCategoryDetailResSchema = z.object({
  statusCode: z.number(),
  data: DailyRequestCategorySchema.extend({
    nameTranslation: z.string().nullable().optional()
  }),
  message: z.string()
})

// Type definitions
export type DailyRequestCategoryType = z.infer<typeof DailyRequestCategorySchema>

export type CreateDailyRequestCategoryBodyInputType = z.infer<
  typeof CreateDailyRequestCategoryBodyInputSchema
>

export type CreateDailyRequestCategoryBodyType = z.infer<
  typeof CreateDailyRequestCategoryBodySchema
>

export type UpdateDailyRequestCategoryBodyInputType = z.infer<
  typeof UpdateDailyRequestCategoryBodyInputSchema
>

export type UpdateDailyRequestCategoryBodyType = z.infer<
  typeof UpdateDailyRequestCategoryBodySchema
>

export type GetParamsDailyRequestCategoryType = z.infer<
  typeof GetParamsDailyRequestCategorySchema
>

export type GetParamDailyRequestCategoryDetailType = z.infer<
  typeof GetDailyRequestCategoryDetailResSchema
>

// Field

type DailyRequestCategoryFieldType = keyof z.infer<typeof DailyRequestCategorySchema>
export const DAILY_REQUEST_CATEGORY_FIELDS = [
  ...Object.keys(DailyRequestCategorySchema.shape),
  'nameTranslation'
] as DailyRequestCategoryFieldType[]
