import { AchievementType } from '@/common/constants/achievement.constant'
import { checkIdSchema } from '@/common/utils/id.validation'
import { ENTITY_MESSAGE } from '@/i18n/message-keys'
import { TranslationInputSchema } from '@/shared/models/translation-input.model'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { AchievementTierType } from '@prisma/client'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'
extendZodWithOpenApi(z)
patchNestJsSwagger()

const conditionMetaSchema = z
  .object({
    types: z.array(z.number().min(0)).optional(),
    pokedexNumbers: z.array(z.number().min(1)).optional()
  })
  .nullable()

export const AchievementSchema = z.object({
  id: z.number(),
  nameKey: z.string(),
  descriptionKey: z.string(),
  imageUrl: z.string().url().optional(),
  achievementTierType: z
    .enum([
      AchievementTierType.BASIC,
      AchievementTierType.INTERMEDIATE,
      AchievementTierType.ADVANCED,
      AchievementTierType.MASTER
    ])
    .nullable(),
  conditionType: z.enum([
    AchievementType.COMPLETE_LESSON,
    AchievementType.CHOOSE_STARTER_POKEMON,
    AchievementType.PLACEMENT_TEST_DONE,
    AchievementType.LEARNING_STREAK,
    AchievementType.CAPTURE_POKEMON_COUNT,
    AchievementType.CAPTURE_TYPE_COLLECTION,
    AchievementType.CAPTURE_ALL_POKEMON,
    AchievementType.CAPTURE_LEGENDARY,
    AchievementType.EVOLVE_POKEMON_FINAL
  ]),
  conditionValue: z.number().min(0).nullable(),
  conditionMeta: conditionMetaSchema,
  rewardId: z.number().nullable(),
  groupId: z.number(),

  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateAchievementBodyInputSchema = AchievementSchema.pick({
  imageUrl: true,
  achievementTierType: true,
  conditionType: true,
  conditionValue: true,
  conditionMeta: true,
  rewardId: true,
  groupId: true
})
  .extend({
    nameTranslations: TranslationInputSchema,
    descriptionTranslations: TranslationInputSchema
  })
  .strict()

export const CreateAchievementBodySchema = AchievementSchema.pick({
  nameKey: true,
  descriptionKey: true,
  imageUrl: true,
  achievementTierType: true,
  conditionType: true,
  conditionValue: true,
  conditionMeta: true,
  rewardId: true,
  groupId: true
})

export const CreateAchievementResSchema = z.object({
  statusCode: z.number(),
  data: AchievementSchema,
  message: z.string()
})

export const UpdateAchievementBodyInputSchema = CreateAchievementBodyInputSchema.partial()
export const UpdateAchievementBodySchema = CreateAchievementBodySchema.partial()

export const UpdateAchievementResSchema = CreateAchievementResSchema

export const GetAchievementParamsSchema = z
  .object({
    achievementId: checkIdSchema(ENTITY_MESSAGE.INVALID_ID)
  })
  .strict()

export const GetAchievementDetailResSchema = z.object({
  statusCode: z.number(),
  data: AchievementSchema.extend({
    nameTranslation: z.string(),
    descriptionTranslation: z.string()
  }),
  message: z.string()
})

//type
export type AchievementType = z.infer<typeof AchievementSchema>

export type CreateAchievementBodyInputType = z.infer<
  typeof CreateAchievementBodyInputSchema
>

export type CreateAchievementBodyType = z.infer<typeof CreateAchievementBodySchema>

export type UpdateAchievementBodyInputType = z.infer<
  typeof UpdateAchievementBodyInputSchema
>

export type UpdateAchievementBodyType = z.infer<typeof UpdateAchievementBodySchema>

export type GetAchievementParamsType = z.infer<typeof GetAchievementParamsSchema>

export type GetAchievementDetailResType = z.infer<typeof GetAchievementDetailResSchema>

// field
type AchievementFieldType = keyof z.infer<typeof AchievementSchema>
export const ACHIEVEMENT_GROUP_FIELDS = [
  ...Object.keys(AchievementSchema.shape),
  'nameTranslation',
  'descriptionTranslation'
] as AchievementFieldType[]
