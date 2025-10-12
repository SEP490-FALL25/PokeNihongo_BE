import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

export const AchievementGroupSchema = z.object({
  id: z.number(),
  nameKey: z.string().min(1),
  descriptionKey: z.string().min(1),
  displayOrder: z.number().min(0),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateAchievementGroupBodyInputSchema = AchievementGroupSchema.pick({
  displayOrder: true
})
  .extend({
    nameTranslations: TranslationInputSchema,
    descriptionTranslations: TranslationInputSchema
  })
  .strict()

export const CreateAchievementGroupBodySchema = AchievementGroupSchema.pick({
  displayOrder: true,
  nameKey: true,
  descriptionKey: true
})

export const CreateAchievementGroupResSchema = z.object({
  statusCode: z.number(),
  data: AchievementGroupSchema,
  message: z.string()
})

export const UpdateAchievementGroupBodyInputSchema =
  CreateAchievementGroupBodyInputSchema.partial()
export const UpdateAchievementGroupBodySchema = CreateAchievementGroupBodySchema.partial()

export const UpdateAchievementGroupResSchema = CreateAchievementGroupResSchema

export const GetAchievementGroupParamsSchema = z
  .object({
    achievementGroupId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
  })
  .strict()

export const GetAchievementGroupDetailResSchema = z.object({
  statusCode: z.number(),
  data: AchievementGroupSchema.extend({
    nameTranslations: z.string(),
    descriptionTranslations: z.string()
  }),
  message: z.string()
})

//type
export type AchievementGroupType = z.infer<typeof AchievementGroupSchema>

export type CreateAchievementGroupBodyInputType = z.infer<
  typeof CreateAchievementGroupBodyInputSchema
>

export type CreateAchievementGroupBodyType = z.infer<
  typeof CreateAchievementGroupBodySchema
>

export type UpdateAchievementGroupBodyInputType = z.infer<
  typeof UpdateAchievementGroupBodyInputSchema
>

export type UpdateAchievementGroupBodyType = z.infer<
  typeof UpdateAchievementGroupBodySchema
>

export type GetAchievementGroupParamsType = z.infer<
  typeof GetAchievementGroupParamsSchema
>

export type GetAchievementGroupDetailResType = z.infer<
  typeof GetAchievementGroupDetailResSchema
>

// field
type AchievementGroupFieldType = keyof z.infer<typeof AchievementGroupSchema>
export const ACHIEVEMENT_GROUP_FIELDS = Object.keys(
  AchievementGroupSchema.shape
) as AchievementGroupFieldType[]
