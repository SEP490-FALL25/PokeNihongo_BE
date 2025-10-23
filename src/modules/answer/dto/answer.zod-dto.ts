import { createZodDto } from 'nestjs-zod'
import {
    CreateAnswerBodyType,
    UpdateAnswerBodyType,
    GetAnswerByIdParamsType,
    GetAnswerListQueryType,
    AnswerListResSchema
} from '../entities/answer.entities'

export class CreateAnswerBodyDTO extends createZodDto(CreateAnswerBodyType) { }
export class UpdateAnswerBodyDTO extends createZodDto(UpdateAnswerBodyType) { }
export class GetAnswerByIdParamsDTO extends createZodDto(GetAnswerByIdParamsType) { }
export class GetAnswerListQueryDTO extends createZodDto(GetAnswerListQueryType) { }
export class AnswerListResDTO extends createZodDto(AnswerListResSchema) { }
