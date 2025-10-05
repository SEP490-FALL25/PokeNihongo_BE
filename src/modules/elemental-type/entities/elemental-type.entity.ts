import { ELEMENTAL_TYPE_MESSAGE } from '@/common/constants/message'
import { checkIdSchema } from '@/common/utils/id.validation'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Schema cho display_name JSON
const DisplayNameSchema = z.object({
  en: z.string().min(1, 'English name is required'),
  vi: z.string().min(1, 'Vietnamese name is required'),
  ja: z.string().min(1, 'Japanese name is required')
})

export const ElementalTypeSchema = z.object({
  id: z.number(),
  type_name: z.string().min(1, ELEMENTAL_TYPE_MESSAGE.TYPE_NAME_REQUIRED),
  display_name: DisplayNameSchema,
  color_hex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, ELEMENTAL_TYPE_MESSAGE.INVALID_COLOR_HEX),
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),
  deletedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateElementalTypeBodySchema = ElementalTypeSchema.pick({
  type_name: true,
  display_name: true,
  color_hex: true
}).strict()

export const CreateElementalTypeResSchema = z.object({
  statusCode: z.number(),
  data: ElementalTypeSchema,
  message: z.string()
})

export const UpdateElementalTypeBodySchema = CreateElementalTypeBodySchema.partial()

export const UpdateElementalTypeResSchema = CreateElementalTypeResSchema

export const GetElementalTypeParamsSchema = z
  .object({
    elementId: checkIdSchema(ELEMENTAL_TYPE_MESSAGE.INVALID_DATA)
  })
  .strict()

export const GetElementalTypeDetailResSchema = z.object({
  statusCode: z.number(),
  data: ElementalTypeSchema,
  message: z.string()
})

// Types
export type ElementalTypeType = z.infer<typeof ElementalTypeSchema>
export type CreateElementalTypeBodyType = z.infer<typeof CreateElementalTypeBodySchema>
export type UpdateElementalTypeBodyType = z.infer<typeof UpdateElementalTypeBodySchema>
export type GetElementalTypeParamsType = z.infer<typeof GetElementalTypeParamsSchema>
export type GetElementalTypeDetailResType = z.infer<
  typeof GetElementalTypeDetailResSchema
>
export type DisplayNameType = z.infer<typeof DisplayNameSchema>

// Fields for query parsing
type ElementalTypeFieldType = keyof z.infer<typeof ElementalTypeSchema>
export const ELEMENTAL_TYPE_FIELDS = Object.keys(
  ElementalTypeSchema.shape
) as ElementalTypeFieldType[]
