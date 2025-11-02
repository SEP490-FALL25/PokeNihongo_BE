import { createZodDto } from 'nestjs-zod'
import {
    CreateGeminiConfigBodySchema,
    CreateGeminiConfigResSchema,
    GetGeminiConfigResSchema,
    GetParamsGeminiConfigSchema,
    UpdateGeminiConfigBodySchema,
    UpdateGeminiConfigResSchema
} from '../entities/gemini-config.entity'

export class CreateGeminiConfigBodyDTO extends createZodDto(
    CreateGeminiConfigBodySchema
) { }
export class CreateGeminiConfigResDTO extends createZodDto(
    CreateGeminiConfigResSchema
) { }
export class UpdateGeminiConfigBodyDTO extends createZodDto(
    UpdateGeminiConfigBodySchema
) { }
export class UpdateGeminiConfigResDTO extends createZodDto(
    UpdateGeminiConfigResSchema
) { }
export class GetParamsGeminiConfigDTO extends createZodDto(
    GetParamsGeminiConfigSchema
) { }
export class GetGeminiConfigResDTO extends createZodDto(
    GetGeminiConfigResSchema
) { }

