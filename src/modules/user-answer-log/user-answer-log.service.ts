import {
    CreateUserAnswerLogBodyType,
    GetUserAnswerLogByIdParamsType,
    GetUserAnswerLogListQueryType,
    UpdateUserAnswerLogBodyType
} from '@/modules/user-answer-log/entities/user-answer-log.entities'
import {
    InvalidUserAnswerLogDataException,
    UserAnswerLogNotFoundException,
    USER_ANSWER_LOG_MESSAGE
} from '@/modules/user-answer-log/dto/user-answer-log.error'
import { UserAnswerLogRepository } from '@/modules/user-answer-log/user-answer-log.repo'
import { isNotFoundPrismaError } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class UserAnswerLogService {
    private readonly logger = new Logger(UserAnswerLogService.name)

    constructor(private readonly userAnswerLogRepository: UserAnswerLogRepository) { }

    async create(body: CreateUserAnswerLogBodyType) {
        try {
            const userAnswerLog = await this.userAnswerLogRepository.create(body)

            return {
                data: userAnswerLog,
                message: USER_ANSWER_LOG_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating user answer log:', error)
            throw InvalidUserAnswerLogDataException
        }
    }

    async findAll(query: GetUserAnswerLogListQueryType) {
        const { currentPage, pageSize, userExerciseAttemptId, questionId, isCorrect } = query

        const result = await this.userAnswerLogRepository.findMany({
            currentPage,
            pageSize,
            userExerciseAttemptId,
            questionId,
            isCorrect
        })

        return {
            statusCode: 200,
            message: USER_ANSWER_LOG_MESSAGE.GET_LIST_SUCCESS,
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

    async findOne(params: GetUserAnswerLogByIdParamsType) {
        const userAnswerLog = await this.userAnswerLogRepository.findUnique({
            id: params.id
        })

        if (!userAnswerLog) {
            throw UserAnswerLogNotFoundException
        }

        return {
            data: userAnswerLog,
            message: USER_ANSWER_LOG_MESSAGE.GET_SUCCESS
        }
    }

    async update(id: number, body: UpdateUserAnswerLogBodyType) {
        try {
            const userAnswerLog = await this.userAnswerLogRepository.update({ id }, body)

            return {
                data: userAnswerLog,
                message: USER_ANSWER_LOG_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            if (isNotFoundPrismaError(error)) {
                throw UserAnswerLogNotFoundException
            }
            this.logger.error('Error updating user answer log:', error)
            throw InvalidUserAnswerLogDataException
        }
    }

    async remove(id: number) {
        try {
            const userAnswerLog = await this.userAnswerLogRepository.delete({ id })

            return {
                data: userAnswerLog,
                message: USER_ANSWER_LOG_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            if (isNotFoundPrismaError(error)) {
                throw UserAnswerLogNotFoundException
            }
            this.logger.error('Error deleting user answer log:', error)
            throw InvalidUserAnswerLogDataException
        }
    }
}

