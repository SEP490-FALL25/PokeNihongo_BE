import { createZodDto } from 'nestjs-zod'
import {
    CreateQuestionBodyType,
    UpdateQuestionBodyType,
    GetQuestionByIdParamsType,
    GetQuestionListQueryType,
    QuestionListResSchema
} from '../entities/question.entities'

export class CreateQuestionBodyDTO extends createZodDto(CreateQuestionBodyType) { }
export class UpdateQuestionBodyDTO extends createZodDto(UpdateQuestionBodyType) { }
export class GetQuestionByIdParamsDTO extends createZodDto(GetQuestionByIdParamsType) { }
export class GetQuestionListQueryDTO extends createZodDto(GetQuestionListQueryType) { }
export class QuestionListResDTO extends createZodDto(QuestionListResSchema) { }
