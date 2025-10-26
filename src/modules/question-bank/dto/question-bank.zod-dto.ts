import { createZodDto } from 'nestjs-zod'
import {
    CreateQuestionBankBodySchema,
    CreateQuestionBankWithMeaningsBodySchema,
    CreateQuestionBankWithAnswersBodySchema,
    UpdateQuestionBankBodySchema,
    GetQuestionBankByIdParamsSchema,
    GetQuestionBankListQuerySchema,
    QuestionBankResSchema,
    QuestionBankListResSchema
} from '../entities/question-bank.entities'

export class CreateQuestionBankBodyDTO extends createZodDto(CreateQuestionBankBodySchema) { }
export class CreateQuestionBankWithMeaningsBodyDTO extends createZodDto(CreateQuestionBankWithMeaningsBodySchema) { }
export class CreateQuestionBankWithAnswersBodyDTO extends createZodDto(CreateQuestionBankWithAnswersBodySchema) { }
export class UpdateQuestionBankBodyDTO extends createZodDto(UpdateQuestionBankBodySchema) { }
export class GetQuestionBankByIdParamsDTO extends createZodDto(GetQuestionBankByIdParamsSchema) { }
export class GetQuestionBankListQueryDTO extends createZodDto(GetQuestionBankListQuerySchema) { }
export class QuestionBankResDTO extends createZodDto(QuestionBankResSchema) { }
export class QuestionBankListResDTO extends createZodDto(QuestionBankListResSchema) { }

