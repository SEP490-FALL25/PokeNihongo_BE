import { createZodDto } from 'nestjs-zod'
import {
    CreateGrammarBodyType,
    UpdateGrammarBodyType,
    GetGrammarByIdParamsType,
    GetGrammarListQueryType,
} from '../entities/grammar.entities'

export class CreateGrammarBodyDTO extends createZodDto(CreateGrammarBodyType) { }
export class UpdateGrammarBodyDTO extends createZodDto(UpdateGrammarBodyType) { }
export class GetGrammarByIdParamsDTO extends createZodDto(GetGrammarByIdParamsType) { }
export class GetGrammarListQueryDTO extends createZodDto(GetGrammarListQueryType) { }
