import {
    CreateQuestionBankBodyType,
    GetQuestionBankByIdParamsType,
    GetQuestionBankListQueryType,
    UpdateQuestionBankBodyType
} from '@/modules/question-bank/entities/question-bank.entities'
import {
    InvalidQuestionBankDataException,
    QuestionBankNotFoundException,
    QUESTION_BANK_MESSAGE
} from '@/modules/question-bank/dto/question-bank.error'
import { QuestionBankRepository } from '@/modules/question-bank/question-bank.repo'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class QuestionBankService {
    private readonly logger = new Logger(QuestionBankService.name)

    constructor(private readonly questionBankRepository: QuestionBankRepository) { }

    async create(body: CreateQuestionBankBodyType, creatorId?: number) {
        try {
            const questionBank = await this.questionBankRepository.create({
                ...body,
                creatorId
            })

            return {
                data: questionBank,
                message: QUESTION_BANK_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating question bank:', error)
            throw InvalidQuestionBankDataException
        }
    }

    async findAll(query: GetQuestionBankListQueryType) {
        const { currentPage, pageSize, levelN, bankType, status, search } = query

        const result = await this.questionBankRepository.findMany({
            currentPage,
            pageSize,
            levelN,
            bankType,
            status,
            search
        })

        return {
            statusCode: 200,
            message: QUESTION_BANK_MESSAGE.GET_LIST_SUCCESS,
            data: {
                results: result.items,
                pagination: {
                    current: result.page,
                    pageSize: result.limit,
                    totalPage: Math.ceil(result.total / result.limit),
                    totalItem: result.total
                }
            }
        }
    }

    async findOne(params: GetQuestionBankByIdParamsType) {
        const questionBank = await this.questionBankRepository.findUnique({
            id: params.id
        })

        if (!questionBank) {
            throw QuestionBankNotFoundException
        }

        return {
            data: questionBank,
            message: QUESTION_BANK_MESSAGE.GET_SUCCESS
        }
    }

    async update(id: number, body: UpdateQuestionBankBodyType) {
        try {
            const questionBank = await this.questionBankRepository.update({ id }, body)

            return {
                data: questionBank,
                message: QUESTION_BANK_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            if (isNotFoundPrismaError(error)) {
                throw QuestionBankNotFoundException
            }
            this.logger.error('Error updating question bank:', error)
            throw InvalidQuestionBankDataException
        }
    }

    async remove(id: number) {
        try {
            const questionBank = await this.questionBankRepository.delete({ id })

            return {
                data: questionBank,
                message: QUESTION_BANK_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            if (isNotFoundPrismaError(error)) {
                throw QuestionBankNotFoundException
            }
            this.logger.error('Error deleting question bank:', error)
            throw InvalidQuestionBankDataException
        }
    }
}

