import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Response DTOs
export const QuestionResponseSchema = z.object({
    id: z.number(),
    questionJp: z.string(),
    questionOrder: z.number(),
    questionKey: z.string(),
    exercisesId: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

export const QuestionListResponseSchema = z.object({
    data: z.array(QuestionResponseSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
})

export class QuestionResponseDTO extends createZodDto(QuestionResponseSchema) { }
export class QuestionListResponseDTO extends createZodDto(QuestionListResponseSchema) { }
