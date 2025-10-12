import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Response DTOs
export const AnswerResponseSchema = z.object({
    id: z.number(),
    answerJp: z.string(),
    answerKey: z.string(),
    isCorrect: z.boolean(),
    questionId: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

export const AnswerListResponseSchema = z.object({
    data: z.array(AnswerResponseSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
})

export class AnswerResponseDTO extends createZodDto(AnswerResponseSchema) { }
export class AnswerListResponseDTO extends createZodDto(AnswerListResponseSchema) { }
