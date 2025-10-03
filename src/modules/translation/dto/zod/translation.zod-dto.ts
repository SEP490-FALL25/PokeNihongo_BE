import { createZodDto } from 'nestjs-zod'
import {
    CreateTranslationSchema,
    UpdateTranslationSchema,
    GetTranslationByIdParamsSchema,
    GetTranslationListQuerySchema,
    GetTranslationsByKeyQuerySchema,
    GetTranslationsByLanguageQuerySchema,
    TranslationSchema
} from '../../entities/translation.entities'

// Zod DTOs - automatically validated
export class CreateTranslationBodyDTO extends createZodDto(CreateTranslationSchema) { }
export class UpdateTranslationBodyDTO extends createZodDto(UpdateTranslationSchema) { }
export class GetTranslationByIdParamsDTO extends createZodDto(GetTranslationByIdParamsSchema) { }
export class GetTranslationListQueryDTO extends createZodDto(GetTranslationListQuerySchema) { }
export class GetTranslationsByKeyQueryDTO extends createZodDto(GetTranslationsByKeyQuerySchema) { }
export class GetTranslationsByLanguageQueryDTO extends createZodDto(GetTranslationsByLanguageQuerySchema) { }
export class TranslationResponseDTO extends createZodDto(TranslationSchema) { }

