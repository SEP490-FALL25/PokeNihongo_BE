import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { GrammarType, GetGrammarListQueryType } from '../entities/grammar.entities'

export const GrammarResponseSchema = z.object({
    data: GrammarType,
    message: z.string(),
})

export const GrammarListResponseSchema = z.object({
    data: z.array(GrammarType),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
    message: z.string(),
})

export class GrammarResponseDTO extends createZodDto(GrammarResponseSchema) { }
export class GrammarListResponseDTO extends createZodDto(GrammarListResponseSchema) { }
