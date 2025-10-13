import {
    CreateVocabularyBodySchema,
    GetVocabularyByIdParamsSchema,
    GetVocabularyListQuerySchema,
    UpdateVocabularyBodySchema,
    VocabularyListResSchema,
    VocabularyResSchema,
    VocabularyStatisticsResSchema,
} from '@/modules/vocabulary/entities/vocabulary.entities'
import { createZodDto } from 'nestjs-zod'

export class CreateVocabularyBodyDTO extends createZodDto(CreateVocabularyBodySchema) { }

export class UpdateVocabularyBodyDTO extends createZodDto(UpdateVocabularyBodySchema) { }

export class GetVocabularyByIdParamsDTO extends createZodDto(GetVocabularyByIdParamsSchema) { }

export class GetVocabularyListQueryDTO extends createZodDto(GetVocabularyListQuerySchema) { }

export class VocabularyResDTO extends createZodDto(VocabularyResSchema) { }

export class VocabularyListResDTO extends createZodDto(VocabularyListResSchema) { }

export class VocabularyStatisticsResDTO extends createZodDto(VocabularyStatisticsResSchema) { }
