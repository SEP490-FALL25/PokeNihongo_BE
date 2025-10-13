import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

// Response DTOs
export const ExercisesResponseSchema = z.object({
    id: z.number(),
    exerciseType: z.string(),
    content: z.string().nullable(),
    audioUrl: z.string().nullable(),
    isBlocked: z.boolean(),
    price: z.number().nullable(),
    lessonId: z.number(),
    createdAt: z.date(),
    updatedAt: z.date(),
})

export const ExercisesListResponseSchema = z.object({
    data: z.array(ExercisesResponseSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
})

export class ExercisesResponseDTO extends createZodDto(ExercisesResponseSchema) { }
export class ExercisesListResponseDTO extends createZodDto(ExercisesListResponseSchema) { }
