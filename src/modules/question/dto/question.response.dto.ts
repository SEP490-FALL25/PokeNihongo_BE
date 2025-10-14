import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'
import { QuestionType, QuestionListResSchema } from '../entities/question.entities'

// Extended Question type with translations
const QuestionWithTranslationsType = QuestionType.extend({
    translations: z.object({
        meaning: z.array(z.object({
            language_code: z.string(),
            value: z.string()
        }))
    }).optional()
})

// Response DTOs
export const QuestionResponseSchema = z.object({
    statusCode: z.number(),
    data: QuestionWithTranslationsType,
    message: z.string()
})

// Use the schema from entities that matches vocabulary/lesson pattern
export const QuestionListResponseSchema = QuestionListResSchema

export class QuestionResponseDTO extends createZodDto(QuestionResponseSchema) { }
export class QuestionListResponseDTO extends createZodDto(QuestionListResponseSchema) { }
