import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { LessonCategoryWithRelationsType } from '../entities/lesson-category.entities'

// Response DTOs
export const LessonCategoryResponseSchema = z.object({
  data: LessonCategoryWithRelationsType,
  message: z.string()
})

export const LessonCategoryListResponseSchema = z.object({
  data: z.array(LessonCategoryWithRelationsType),
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  totalPages: z.number(),
  message: z.string()
})

// DTO Classes
export class LessonCategoryResponseDTO extends createZodDto(LessonCategoryResponseSchema) {}
export class LessonCategoryListResponseDTO extends createZodDto(LessonCategoryListResponseSchema) {}
