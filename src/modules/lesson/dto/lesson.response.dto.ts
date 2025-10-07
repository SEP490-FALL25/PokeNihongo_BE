import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { LessonWithRelationsType } from '../entities/lesson.entities'

// Response DTOs
export const LessonResponseSchema = z.object({
    data: LessonWithRelationsType,
    message: z.string()
})

export const LessonListResponseSchema = z.object({
    data: z.array(LessonWithRelationsType),
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    message: z.string()
})

// DTO Classes
export class LessonResponseDTO extends createZodDto(LessonResponseSchema) { }
export class LessonListResponseDTO extends createZodDto(LessonListResponseSchema) { }