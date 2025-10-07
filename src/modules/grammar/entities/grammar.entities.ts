import { extendZodWithOpenApi } from '@anatine/zod-openapi'
import { patchNestJsSwagger } from 'nestjs-zod'
import { z } from 'zod'

extendZodWithOpenApi(z)
patchNestJsSwagger()

// Grammar Entity Types
export const GrammarType = z.object({
    id: z.number(),
    structure: z.string(),
    level: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

// Request/Response Types
export const CreateGrammarBodyType = z.object({
    structure: z.string().min(1).max(500),
    level: z.string().min(1).max(10),
    usage: z.object({
        exampleSentenceJp: z.string().min(1).max(1000),
    }).optional(),
    translations: z.object({
        usage: z.array(z.object({
            language_code: z.string(),
            explanation: z.string(),
            example: z.string()
        })).optional(),
    }).optional(),
})

export const UpdateGrammarBodyType = z.object({
    structure: z.string().min(1).max(500).optional(),
    level: z.string().min(1).max(10).optional(),
})

export const GetGrammarByIdParamsType = z.object({
    id: z.string().transform(Number),
})

export const GetGrammarListQueryType = z.object({
    page: z.string().transform(Number).default('1'),
    limit: z.string().transform(Number).default('10'),
    level: z.string().optional(),
    search: z.string().optional(),
})

// Type exports
export type GrammarType = z.infer<typeof GrammarType>
export type CreateGrammarBodyType = z.infer<typeof CreateGrammarBodyType>
export type UpdateGrammarBodyType = z.infer<typeof UpdateGrammarBodyType>
export type GetGrammarByIdParamsType = z.infer<typeof GetGrammarByIdParamsType>
export type GetGrammarListQueryType = z.infer<typeof GetGrammarListQueryType>
