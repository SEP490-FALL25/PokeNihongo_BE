import { Injectable, Logger } from '@nestjs/common'
import {
    CreateAnswerBodyType,
    UpdateAnswerBodyType,
    GetAnswerByIdParamsType,
    GetAnswerListQueryType,
} from './entities/answer.entities'
import {
    AnswerNotFoundException,
    AnswerAlreadyExistsException,
    InvalidAnswerDataException,
    QuestionNotFoundException,
} from './dto/answer.error'
import { AnswerRepository } from './answer.repo'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class AnswerService {
    private readonly logger = new Logger(AnswerService.name)

    constructor(
        private readonly answerRepository: AnswerRepository
    ) { }

    //#region Get Answer
    async getAnswerList(params: GetAnswerListQueryType) {
        try {
            this.logger.log('Getting answer list with params:', params)

            const result = await this.answerRepository.findMany(params)

            this.logger.log(`Found ${result.data.length} answer entries`)
            return {
                statusCode: 200,
                message: 'Lấy danh sách câu trả lời thành công',
                data: {
                    results: result.data,
                    pagination: {
                        current: result.page,
                        pageSize: result.limit,
                        totalPage: result.totalPages,
                        totalItem: result.total
                    }
                }
            }
        } catch (error) {
            this.logger.error('Error getting answer list:', error)
            throw error
        }
    }

    async getAnswerById(params: GetAnswerByIdParamsType) {
        try {
            this.logger.log(`Getting answer by id: ${params.id}`)

            const answer = await this.answerRepository.findById(params.id)

            if (!answer) {
                throw new AnswerNotFoundException()
            }

            this.logger.log(`Found answer: ${answer.id}`)
            return {
                data: answer,
                message: 'Lấy thông tin câu trả lời thành công'
            }
        } catch (error) {
            this.logger.error(`Error getting answer by id ${params.id}:`, error)

            if (error instanceof AnswerNotFoundException) {
                throw error
            }

            throw new InvalidAnswerDataException('Lỗi khi lấy thông tin câu trả lời')
        }
    }
    //#endregion

    //#region Create Answer
    async createAnswer(data: CreateAnswerBodyType) {
        try {
            this.logger.log('Creating answer with data:', data)

            // Check if question exists
            const questionExists = await this.answerRepository.checkQuestionExists(data.questionId)
            if (!questionExists) {
                throw new QuestionNotFoundException()
            }

            // Create answer first with temporary answerKey
            const tempData = { ...data, answerKey: 'temp' }
            const answer = await this.answerRepository.create(tempData)

            // Generate answerKey with actual ID
            const answerKey = `answer.${answer.id}.text`

            // Update with correct answerKey
            const updatedAnswer = await this.answerRepository.update(answer.id, { answerKey } as any)

            this.logger.log(`Created answer: ${updatedAnswer.id}`)
            return {
                data: updatedAnswer,
                message: 'Tạo câu trả lời thành công'
            }
        } catch (error) {
            this.logger.error('Error creating answer:', error)

            if (error instanceof QuestionNotFoundException || error instanceof AnswerAlreadyExistsException) {
                throw error
            }

            if (isUniqueConstraintPrismaError(error)) {
                throw new AnswerAlreadyExistsException()
            }

            throw new InvalidAnswerDataException('Lỗi khi tạo câu trả lời')
        }
    }
    //#endregion

    //#region Update Answer
    async updateAnswer(id: number, data: UpdateAnswerBodyType) {
        try {
            this.logger.log(`Updating answer ${id} with data:`, data)

            // Check if answer exists
            const answer = await this.answerRepository.findById(id)
            if (!answer) {
                throw new AnswerNotFoundException()
            }

            // Check if question exists (if updating questionId)
            if (data.questionId) {
                const questionExists = await this.answerRepository.checkQuestionExists(data.questionId)
                if (!questionExists) {
                    throw new QuestionNotFoundException()
                }
            }

            // Update answer first
            const updatedAnswer = await this.answerRepository.update(id, data)

            // Generate new answerKey if answerJp changed
            if (data.answerJp) {
                const newAnswerKey = `answer.${id}.text`

                // Update with new answerKey
                const finalUpdatedAnswer = await this.answerRepository.update(id, { answerKey: newAnswerKey } as any)
                return {
                    data: finalUpdatedAnswer,
                    message: 'Cập nhật câu trả lời thành công'
                }
            }

            this.logger.log(`Updated answer: ${updatedAnswer.id}`)
            return {
                data: updatedAnswer,
                message: 'Cập nhật câu trả lời thành công'
            }
        } catch (error) {
            this.logger.error(`Error updating answer ${id}:`, error)

            if (error instanceof AnswerNotFoundException ||
                error instanceof QuestionNotFoundException ||
                error instanceof AnswerAlreadyExistsException) {
                throw error
            }

            throw new InvalidAnswerDataException('Lỗi khi cập nhật câu trả lời')
        }
    }
    //#endregion

    //#region Delete Answer
    async deleteAnswer(id: number) {
        try {
            this.logger.log(`Deleting answer ${id}`)

            // Check if answer exists
            const answer = await this.answerRepository.findById(id)
            if (!answer) {
                throw new AnswerNotFoundException()
            }

            await this.answerRepository.delete(id)

            this.logger.log(`Deleted answer ${id}`)
            return {
                message: 'Xóa câu trả lời thành công'
            }
        } catch (error) {
            this.logger.error(`Error deleting answer ${id}:`, error)

            if (error instanceof AnswerNotFoundException) {
                throw error
            }

            if (isNotFoundPrismaError(error)) {
                throw new AnswerNotFoundException()
            }

            throw new InvalidAnswerDataException('Lỗi khi xóa câu trả lời')
        }
    }
    //#endregion
}
