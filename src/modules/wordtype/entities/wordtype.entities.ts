import { z } from 'zod'

// Validation functions
const isValidTranslationKey = (key: string): boolean => {
    // Translation key pattern: wordtype.1.name, wordtype.1.description, etc.
    const translationKeyRegex = /^[a-zA-Z][a-zA-Z0-9._-]*$/
    return translationKeyRegex.test(key)
}

const TRANSLATION_KEY_ERROR = 'Translation key phải bắt đầu bằng chữ cái và chỉ chứa chữ cái, số, dấu chấm, gạch dưới, gạch ngang'

// Base WordType schema
export const WordTypeSchema = z.object({
    id: z.number(),
    nameKey: z
        .string()
        .min(1, 'Name key không được để trống')
        .max(100, 'Name key quá dài (tối đa 100 ký tự)')
        .refine(isValidTranslationKey, {
            message: TRANSLATION_KEY_ERROR
        }),
    tag: z
        .string()
        .max(50, 'Tag quá dài (tối đa 50 ký tự)')
        .nullable()
        .optional(),
    createdAt: z.date(),
    updatedAt: z.date()
})

// Create WordType schema (API layer - không có nameKey)
export const CreateWordTypeSchema = z.object({
    tag: z
        .string()
        .min(1, 'Tag không được để trống')
        .max(50, 'Tag quá dài (tối đa 50 ký tự)')
})

// Create WordType service schema (bao gồm auto-generated nameKey)
export const CreateWordTypeServiceSchema = z.object({
    nameKey: z
        .string()
        .min(1, 'Name key không được để trống')
        .max(100, 'Name key quá dài (tối đa 100 ký tự)')
        .refine(isValidTranslationKey, {
            message: TRANSLATION_KEY_ERROR
        }),
    tag: z
        .string()
        .min(1, 'Tag không được để trống')
        .max(50, 'Tag quá dài (tối đa 50 ký tự)')
})

// Update WordType schema (API layer - không có nameKey)
export const UpdateWordTypeSchema = z.object({
    tag: z
        .string()
        .min(1, 'Tag không được để trống')
        .max(50, 'Tag quá dài (tối đa 50 ký tự)')
        .optional()
})

// Update WordType service schema (bao gồm auto-generated nameKey)
export const UpdateWordTypeServiceSchema = z.object({
    nameKey: z
        .string()
        .min(1, 'Name key không được để trống')
        .max(100, 'Name key quá dài (tối đa 100 ký tự)')
        .refine(isValidTranslationKey, {
            message: TRANSLATION_KEY_ERROR
        })
        .optional(),
    tag: z
        .string()
        .min(1, 'Tag không được để trống')
        .max(50, 'Tag quá dài (tối đa 50 ký tự)')
        .optional()
})

// Get WordType by ID params schema
export const GetWordTypeByIdParamsSchema = z.object({
    id: z.string().transform((val) => parseInt(val, 10))
})

// Get WordType list query schema
export const GetWordTypeListQuerySchema = z.object({
    page: z.string().transform((val) => parseInt(val, 10)).optional(),
    limit: z.string().transform((val) => parseInt(val, 10)).optional(),
    sortBy: z.enum(['id', 'nameKey', 'tag', 'createdAt', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    tag: z.string().optional()
})

// Get WordType by tag params schema
export const GetWordTypeByTagParamsSchema = z.object({
    tag: z.string().min(1, 'Tag không được để trống')
})

// Type exports
export type WordType = z.infer<typeof WordTypeSchema>
export type CreateWordTypeBodyType = z.infer<typeof CreateWordTypeSchema>
export type CreateWordTypeServiceType = z.infer<typeof CreateWordTypeServiceSchema>
export type UpdateWordTypeBodyType = z.infer<typeof UpdateWordTypeSchema>
export type UpdateWordTypeServiceType = z.infer<typeof UpdateWordTypeServiceSchema>
export type GetWordTypeByIdParamsType = z.infer<typeof GetWordTypeByIdParamsSchema>
export type GetWordTypeListQueryType = z.infer<typeof GetWordTypeListQuerySchema>
