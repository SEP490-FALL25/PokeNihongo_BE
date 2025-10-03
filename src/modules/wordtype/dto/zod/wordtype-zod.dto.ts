import { createZodDto } from 'nestjs-zod'
import {
    CreateWordTypeSchema,
    UpdateWordTypeSchema,
    GetWordTypeByIdParamsSchema,
    GetWordTypeListQuerySchema,
    GetWordTypeByTagParamsSchema,
    WordTypeSchema
} from '../../entities/wordtype.entities'

// Zod DTOs
export class CreateWordTypeBodyDTO extends createZodDto(CreateWordTypeSchema) { }
export class UpdateWordTypeBodyDTO extends createZodDto(UpdateWordTypeSchema) { }
export class GetWordTypeByIdParamsDTO extends createZodDto(GetWordTypeByIdParamsSchema) { }
export class GetWordTypeListQueryDTO extends createZodDto(GetWordTypeListQuerySchema) { }
export class GetWordTypeByTagParamsDTO extends createZodDto(GetWordTypeByTagParamsSchema) { }
export class WordTypeResponseDTO extends createZodDto(WordTypeSchema) { }
