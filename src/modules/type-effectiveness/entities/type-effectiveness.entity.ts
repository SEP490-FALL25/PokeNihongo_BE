import { TYPE_EFFECTIVENESS_MESSAGE } from '@/common/constants/message'
import { checkIdSchema } from '@/common/utils/id.validation'
import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Base TypeEffectiveness Schema
export const TypeEffectivenessSchema = z.object({
  id: z.number(),
  attackerId: z.number(),
  defenderId: z.number(),
  multiplier: z
    .number()
    .min(0, 'Multiplier phải lớn hơn hoặc bằng 0')
    .max(4, 'Multiplier phải nhỏ hơn hoặc bằng 4')
    .refine((val) => [0, 0.25, 0.5, 1, 2, 4].includes(val), {
      message: 'Multiplier chỉ được phép là 0, 0.25, 0.5, 1, 2, hoặc 4'
    }),

  // Audit fields
  createdById: z.number().nullable(),
  updatedById: z.number().nullable(),
  deletedById: z.number().nullable(),

  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable()
})

// Create Schema - chỉ cần attackerId, defenderId, multiplier
export const CreateTypeEffectivenessBodySchema = TypeEffectivenessSchema.pick({
  attackerId: true,
  defenderId: true,
  multiplier: true
})
  .strict()
  .refine((data) => data.attackerId !== data.defenderId, {
    message: 'Attacker và Defender không thể giống nhau',
    path: ['attackerId']
  })

export const CreateTypeEffectivenessResSchema = z.object({
  statusCode: z.number(),
  data: TypeEffectivenessSchema,
  message: z.string()
})

// Update Schema - có thể update multiplier
export const UpdateTypeEffectivenessBodySchema = TypeEffectivenessSchema.pick({
  attackerId: true,
  defenderId: true,
  multiplier: true
})
  .partial()
  .strict()
  .refine((data) => data.attackerId !== data.defenderId, {
    message: 'Attacker và Defender không thể giống nhau',
    path: ['attackerId']
  })

export const UpdateTypeEffectivenessResSchema = CreateTypeEffectivenessResSchema

// Query Schema cho filtering
export const GetTypeEffectivenessParamsSchema = z.object({
  typeEffectivenessId: checkIdSchema(TYPE_EFFECTIVENESS_MESSAGE.INVALID_ID)
})

export const GetTypeEffectivenessDetailResSchema = z.object({
  statusCode: z.number(),
  data: z.object({
    ...TypeEffectivenessSchema.shape,
    attacker: z
      .object({
        id: z.number(),
        type_name: z.string(),
        display_name: z.any(),
        color_hex: z.string()
      })
      .optional()
      .nullable(),
    defender: z
      .object({
        id: z.number(),
        type_name: z.string(),
        display_name: z.any(),
        color_hex: z.string()
      })
      .optional()
      .nullable()
  }),
  message: z.string()
})

// Response Schema với thông tin attacker và defender
export const TypeEffectivenessResponseSchema = TypeEffectivenessSchema.extend({
  attacker: z
    .object({
      id: z.number(),
      type_name: z.string(),
      display_name: z.any(),
      color_hex: z.string()
    })
    .optional(),
  defender: z
    .object({
      id: z.number(),
      type_name: z.string(),
      display_name: z.any(),
      color_hex: z.string()
    })
    .optional()
})

// Type exports
export type TypeEffectivenessType = z.infer<typeof TypeEffectivenessSchema>
export type CreateTypeEffectivenessBodyType = z.infer<
  typeof CreateTypeEffectivenessBodySchema
>
export type UpdateTypeEffectivenessBodyType = z.infer<
  typeof UpdateTypeEffectivenessBodySchema
>
export type GetTypeEffectivenessParamsType = z.infer<
  typeof GetTypeEffectivenessParamsSchema
>
export type GetTypeEffectivenessDetailResType = z.infer<
  typeof GetTypeEffectivenessDetailResSchema
>
//Field for query
export type TypeEffectivenessFieldType = keyof z.infer<typeof TypeEffectivenessSchema>
export const TYPE_EFFECTIVENESS_FIELDS = Object.keys(
  TypeEffectivenessSchema.shape
) as TypeEffectivenessFieldType[]
