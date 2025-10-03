import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Custom validation functions for Translation
const isValidLanguageCode = (code: string): boolean => {
    // Language codes should be 2-3 characters (ISO 639-1 or ISO 639-2)
    const languageCodeRegex = /^[a-z]{2,3}$/
    return languageCodeRegex.test(code)
}

const isValidTranslationKey = (key: string): boolean => {
    // Translation keys should follow pattern: module.id.field (e.g., lesson.1.title)
    const keyRegex = /^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)*$/
    return keyRegex.test(key)
}

// Custom error messages
const LANGUAGE_CODE_ERROR = 'Mã ngôn ngữ phải là 2-3 ký tự chữ cái thường (ISO 639-1/639-2)'
const TRANSLATION_KEY_ERROR = 'Key dịch phải theo định dạng: module.id.field (ví dụ: lesson.1.title)'

export const TranslationSchema = z.object({
    id: z.number(),
    languageCode: z
        .string()
        .min(2, 'Mã ngôn ngữ phải có ít nhất 2 ký tự')
        .max(10, 'Mã ngôn ngữ quá dài (tối đa 10 ký tự)')
        .refine(isValidLanguageCode, {
            message: LANGUAGE_CODE_ERROR
        }),
    key: z
        .string()
        .min(1, 'Key dịch không được để trống')
        .max(500, 'Key dịch quá dài (tối đa 500 ký tự)')
        .refine(isValidTranslationKey, {
            message: TRANSLATION_KEY_ERROR
        }),
    value: z
        .string()
        .min(1, 'Nội dung dịch không được để trống')
        .max(2000, 'Nội dung dịch quá dài (tối đa 2000 ký tự)'),
    createdAt: z.date(),
    updatedAt: z.date()
})

export const CreateTranslationSchema = z.object({
    languageCode: z
        .string()
        .min(2, 'Mã ngôn ngữ phải có ít nhất 2 ký tự')
        .max(10, 'Mã ngôn ngữ quá dài (tối đa 10 ký tự)')
        .refine(isValidLanguageCode, {
            message: LANGUAGE_CODE_ERROR
        }),
    key: z
        .string()
        .min(1, 'Key dịch không được để trống')
        .max(500, 'Key dịch quá dài (tối đa 500 ký tự)')
        .refine(isValidTranslationKey, {
            message: TRANSLATION_KEY_ERROR
        }),
    value: z
        .string()
        .min(1, 'Nội dung dịch không được để trống')
        .max(2000, 'Nội dung dịch quá dài (tối đa 2000 ký tự)')
})

export const UpdateTranslationSchema = z.object({
    languageCode: z
        .string()
        .min(2, 'Mã ngôn ngữ phải có ít nhất 2 ký tự')
        .max(10, 'Mã ngôn ngữ quá dài (tối đa 10 ký tự)')
        .refine(isValidLanguageCode, {
            message: LANGUAGE_CODE_ERROR
        })
        .optional(),
    key: z
        .string()
        .min(1, 'Key dịch không được để trống')
        .max(500, 'Key dịch quá dài (tối đa 500 ký tự)')
        .refine(isValidTranslationKey, {
            message: TRANSLATION_KEY_ERROR
        })
        .optional(),
    value: z
        .string()
        .min(1, 'Nội dung dịch không được để trống')
        .max(2000, 'Nội dung dịch quá dài (tối đa 2000 ký tự)')
        .optional()
})

export const GetTranslationByIdParamsSchema = z.object({
    id: z.string().transform((val) => parseInt(val, 10))
})

export const GetTranslationListQuerySchema = z.object({
    page: z.string().transform((val) => parseInt(val, 10)).default('1'),
    limit: z.string().transform((val) => parseInt(val, 10)).default('10'),
    search: z.string().optional(),
    languageCode: z.string().optional(),
    key: z.string().optional()
})

export const GetTranslationsByKeyQuerySchema = z.object({
    key: z.string().min(1, 'Key dịch không được để trống')
})

export const GetTranslationsByLanguageQuerySchema = z.object({
    languageCode: z.string().min(2, 'Mã ngôn ngữ không được để trống'),
    page: z.string().transform((val) => parseInt(val, 10)).default('1'),
    limit: z.string().transform((val) => parseInt(val, 10)).default('10')
})

// Type exports
export type TranslationType = z.infer<typeof TranslationSchema>
export type CreateTranslationBodyType = z.infer<typeof CreateTranslationSchema>
export type UpdateTranslationBodyType = z.infer<typeof UpdateTranslationSchema>
export type GetTranslationByIdParamsType = z.infer<typeof GetTranslationByIdParamsSchema>
export type GetTranslationListQueryType = z.infer<typeof GetTranslationListQuerySchema>
export type GetTranslationsByKeyQueryType = z.infer<typeof GetTranslationsByKeyQuerySchema>
export type GetTranslationsByLanguageQueryType = z.infer<typeof GetTranslationsByLanguageQuerySchema>
