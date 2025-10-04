import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Custom validation functions for Kanji
const isKanjiCharacter = (text: string): boolean => {
    // Check if it's a single Kanji character
    if (text.length !== 1) {
        return false
    }

    // Kanji Unicode ranges
    const kanjiRegex = /[\u4E00-\u9FAF\u3400-\u4DBF\u20000-\u2A6DF\u2A700-\u2B73F\u2B740-\u2B81F\u2B820-\u2CEAF\uF900-\uFAFF\u2F800-\u2FA1F]/
    return kanjiRegex.test(text)
}

const isOnyomiKunyomi = (text: string): boolean => {
    // Onyomi and Kunyomi contain Hiragana, Katakana, and some punctuation
    const onyomiKunyomiRegex = /^[\u3040-\u309F\u30A0-\u30FF\s\-\.\,\!\?\'\"]+$/
    return onyomiKunyomiRegex.test(text)
}

// Custom error messages
const KANJI_CHARACTER_ERROR = 'Phải là một ký tự Kanji duy nhất'
const ONYOMI_KUNYOMI_ERROR = 'Phải là cách đọc Onyomi/Kunyomi (chỉ chứa Hiragana, Katakana và dấu câu cơ bản)'


export const KanjiSchema = z.object({
    id: z.number(),
    character: z
        .string()
        .min(1, 'Ký tự Kanji không được để trống')
        .max(10, 'Ký tự Kanji quá dài (tối đa 10 ký tự)')
        .refine(isKanjiCharacter, {
            message: KANJI_CHARACTER_ERROR
        }),
    meaningKey: z
        .string()
        .min(1, 'Key nghĩa không được để trống')
        .max(200, 'Key nghĩa quá dài (tối đa 200 ký tự)'),
    strokeCount: z
        .number()
        .min(1, 'Số nét vẽ phải lớn hơn 0')
        .max(50, 'Số nét vẽ quá lớn (tối đa 50 nét)')
        .nullable()
        .optional(),
    jlptLevel: z
        .number()
        .min(1, 'Cấp độ JLPT phải từ 1-5')
        .max(5, 'Cấp độ JLPT phải từ 1-5')
        .nullable()
        .optional(),
    img: z
        .string()
        .max(500, 'URL hình ảnh quá dài (tối đa 500 ký tự)')
        .nullable()
        .optional(),
    createdAt: z.date(),
    updatedAt: z.date()
})


export const CreateKanjiSchema = z.object({
    character: z
        .string()
        .min(1, 'Ký tự Kanji không được để trống')
        .max(10, 'Ký tự Kanji quá dài (tối đa 10 ký tự)')
        .refine(isKanjiCharacter, {
            message: KANJI_CHARACTER_ERROR
        }),
    meaningKey: z
        .string()
        .min(1, 'Key nghĩa không được để trống')
        .max(200, 'Key nghĩa quá dài (tối đa 200 ký tự)'),
    strokeCount: z
        .number()
        .min(1, 'Số nét vẽ phải lớn hơn 0')
        .max(50, 'Số nét vẽ quá lớn (tối đa 50 nét)')
        .optional(),
    jlptLevel: z
        .number()
        .min(1, 'Cấp độ JLPT phải từ 1-5')
        .max(5, 'Cấp độ JLPT phải từ 1-5')
        .optional(),
    img: z
        .string()
        .max(500, 'URL hình ảnh quá dài (tối đa 500 ký tự)')
        .optional(),
})

export const UpdateKanjiSchema = z.object({
    character: z
        .string()
        .min(1, 'Ký tự Kanji không được để trống')
        .max(10, 'Ký tự Kanji quá dài (tối đa 10 ký tự)')
        .refine(isKanjiCharacter, {
            message: KANJI_CHARACTER_ERROR
        })
        .optional(),
    meaningKey: z
        .string()
        .min(1, 'Key nghĩa không được để trống')
        .max(200, 'Key nghĩa quá dài (tối đa 200 ký tự)')
        .optional(),
    strokeCount: z
        .number()
        .min(1, 'Số nét vẽ phải lớn hơn 0')
        .max(50, 'Số nét vẽ quá lớn (tối đa 50 nét)')
        .optional(),
    jlptLevel: z
        .number()
        .min(1, 'Cấp độ JLPT phải từ 1-5')
        .max(5, 'Cấp độ JLPT phải từ 1-5')
        .optional(),
    img: z
        .string()
        .max(500, 'URL hình ảnh quá dài (tối đa 500 ký tự)')
        .optional()
})


// Get Kanji by ID params schema
export const GetKanjiByIdParamsSchema = z.object({
    id: z.string().transform((val) => parseInt(val, 10))
})


// Get Kanji list query schema
export const GetKanjiListQuerySchema = z.object({
    page: z.string().transform((val) => parseInt(val, 10)).optional(),
    limit: z.string().transform((val) => parseInt(val, 10)).optional(),
    sortBy: z.enum(['id', 'character', 'meaningKey', 'strokeCount', 'jlptLevel', 'createdAt', 'updatedAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    jlptLevel: z.string().transform((val) => parseInt(val, 10)).optional(),
    strokeCount: z.string().transform((val) => parseInt(val, 10)).optional()
})


// List Response Schema (internal use)
export const KanjiListResponseSchema = z.object({
    data: z.array(KanjiSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number()
})

// Standard Response Schemas (like vocabulary pattern)
export const KanjiResSchema = z
    .object({
        statusCode: z.number(),
        data: KanjiSchema,
        message: z.string()
    })
    .strict()

export const KanjiListResSchema = z
    .object({
        statusCode: z.number(),
        data: z.object({
            items: z.array(KanjiSchema),
            total: z.number(),
            page: z.number(),
            limit: z.number()
        }),
        message: z.string()
    })
    .strict()

// Type exports
export type Kanji = z.infer<typeof KanjiSchema>
export type CreateKanjiBodyType = z.infer<typeof CreateKanjiSchema>
export type UpdateKanjiBodyType = z.infer<typeof UpdateKanjiSchema>
export type GetKanjiByIdParamsType = z.infer<typeof GetKanjiByIdParamsSchema>
export type GetKanjiListQueryType = z.infer<typeof GetKanjiListQuerySchema>
export type KanjiResType = z.infer<typeof KanjiResSchema>
export type KanjiListResType = z.infer<typeof KanjiListResSchema>