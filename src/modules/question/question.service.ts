import { Injectable, Logger } from '@nestjs/common'
import {
    CreateQuestionBodyType,
    UpdateQuestionBodyType,
    GetQuestionByIdParamsType,
    GetQuestionListQueryType,
} from './entities/question.entities'
import {
    QuestionNotFoundException,
    QuestionAlreadyExistsException,
    InvalidQuestionDataException,
    ExercisesNotFoundException,
} from './dto/question.error'
import { QuestionRepository } from './question.repo'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'

@Injectable()
export class QuestionService {
    private readonly logger = new Logger(QuestionService.name)

    constructor(
        private readonly questionRepository: QuestionRepository
    ) { }

    //#region Get Question
    async getQuestionList(params: GetQuestionListQueryType) {
        try {
            this.logger.log('Getting question list with params:', params)

            const result = await this.questionRepository.findMany(params)

            this.logger.log(`Found ${result.data.length} question entries`)
            return {
                statusCode: 200,
                message: 'Lấy danh sách câu hỏi thành công',
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
            this.logger.error('Error getting question list:', error)
            throw error
        }
    }

    async getQuestionById(params: GetQuestionByIdParamsType) {
        try {
            this.logger.log(`Getting question by id: ${params.id}`)

            const question = await this.questionRepository.findById(params.id)

            if (!question) {
                throw new QuestionNotFoundException()
            }

            this.logger.log(`Found question: ${question.id}`)
            return {
                data: question,
                message: 'Lấy thông tin câu hỏi thành công'
            }
        } catch (error) {
            this.logger.error(`Error getting question by id ${params.id}:`, error)

            if (error instanceof QuestionNotFoundException) {
                throw error
            }

            throw new InvalidQuestionDataException('Lỗi khi lấy thông tin câu hỏi')
        }
    }
    //#endregion

    //#region Create Question
    async createQuestion(data: CreateQuestionBodyType) {
        try {
            this.logger.log('Creating question with data:', data)

            // Check if exercises exists
            const exercisesExists = await this.questionRepository.checkExercisesExists(data.exercisesId)
            if (!exercisesExists) {
                throw new ExercisesNotFoundException()
            }

            // Create question first with temporary questionKey
            const tempData = { ...data, questionKey: 'temp' }
            const question = await this.questionRepository.create(tempData)

            // Generate questionKey with actual ID
            const questionKey = `question.${question.id}.text`

            // Update with correct questionKey
            const updatedQuestion = await this.questionRepository.update(question.id, { questionKey })

            this.logger.log(`Created question: ${updatedQuestion.id}`)
            return {
                data: updatedQuestion,
                message: 'Tạo câu hỏi thành công'
            }
        } catch (error) {
            this.logger.error('Error creating question:', error)

            if (error instanceof ExercisesNotFoundException || error instanceof QuestionAlreadyExistsException) {
                throw error
            }

            if (isUniqueConstraintPrismaError(error)) {
                throw new QuestionAlreadyExistsException()
            }

            throw new InvalidQuestionDataException('Lỗi khi tạo câu hỏi')
        }
    }
    //#endregion

    //#region Update Question
    async updateQuestion(id: number, data: UpdateQuestionBodyType) {
        try {
            this.logger.log(`Updating question ${id} with data:`, data)

            // Check if question exists
            const question = await this.questionRepository.findById(id)
            if (!question) {
                throw new QuestionNotFoundException()
            }

            // Check if exercises exists (if updating exercisesId)
            if (data.exercisesId) {
                const exercisesExists = await this.questionRepository.checkExercisesExists(data.exercisesId)
                if (!exercisesExists) {
                    throw new ExercisesNotFoundException()
                }
            }

            // Update question first
            const updatedQuestion = await this.questionRepository.update(id, data)

            // Generate new questionKey if questionJp changed
            if (data.questionJp) {
                const newQuestionKey = `question.${id}.text`

                // Update with new questionKey
                const finalUpdatedQuestion = await this.questionRepository.update(id, { questionKey: newQuestionKey })
                return {
                    data: finalUpdatedQuestion,
                    message: 'Cập nhật câu hỏi thành công'
                }
            }

            this.logger.log(`Updated question: ${updatedQuestion.id}`)
            return {
                data: updatedQuestion,
                message: 'Cập nhật câu hỏi thành công'
            }
        } catch (error) {
            this.logger.error(`Error updating question ${id}:`, error)

            if (error instanceof QuestionNotFoundException ||
                error instanceof ExercisesNotFoundException ||
                error instanceof QuestionAlreadyExistsException) {
                throw error
            }

            throw new InvalidQuestionDataException('Lỗi khi cập nhật câu hỏi')
        }
    }
    //#endregion

    //#region Delete Question
    async deleteQuestion(id: number) {
        try {
            this.logger.log(`Deleting question ${id}`)

            // Check if question exists
            const question = await this.questionRepository.findById(id)
            if (!question) {
                throw new QuestionNotFoundException()
            }

            await this.questionRepository.delete(id)

            this.logger.log(`Deleted question ${id}`)
            return {
                message: 'Xóa câu hỏi thành công'
            }
        } catch (error) {
            this.logger.error(`Error deleting question ${id}:`, error)

            if (error instanceof QuestionNotFoundException) {
                throw error
            }

            if (isNotFoundPrismaError(error)) {
                throw new QuestionNotFoundException()
            }

            throw new InvalidQuestionDataException('Lỗi khi xóa câu hỏi')
        }
    }
    //#endregion
}
