import {
    CreateUserExerciseAttemptBodyType,
    GetUserExerciseAttemptByIdParamsType,
    GetUserExerciseAttemptListQueryType,
    UpdateUserExerciseAttemptBodyType
} from '@/modules/user-exercise-attempt/entities/user-exercise-attempt.entities'
import {
    InvalidUserExerciseAttemptDataException,
    UserExerciseAttemptNotFoundException,
    USER_EXERCISE_ATTEMPT_MESSAGE
} from '@/modules/user-exercise-attempt/dto/user-exercise-attempt.error'
import { UserExerciseAttemptRepository } from '@/modules/user-exercise-attempt/user-exercise-attempt.repo'
import { isNotFoundPrismaError } from '@/shared/helpers'
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
export class UserExerciseAttemptService {
    private readonly logger = new Logger(UserExerciseAttemptService.name)

    constructor(private readonly userExerciseAttemptRepository: UserExerciseAttemptRepository) { }

    async create(userId: number, exerciseId: number) {
        try {
            const userExerciseAttempt = await this.userExerciseAttemptRepository.create({
                userId: userId,
                exerciseId: exerciseId
            })

            return {
                data: userExerciseAttempt,
                message: USER_EXERCISE_ATTEMPT_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating user exercise attempt:', error)
            throw InvalidUserExerciseAttemptDataException
        }
    }

    async findAll(query: GetUserExerciseAttemptListQueryType) {
        const { currentPage, pageSize, userId, exerciseId, status } = query

        const result = await this.userExerciseAttemptRepository.findMany({
            currentPage,
            pageSize,
            userId,
            exerciseId,
            status
        })

        return {
            statusCode: 200,
            message: USER_EXERCISE_ATTEMPT_MESSAGE.GET_LIST_SUCCESS,
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

    async findOne(params: GetUserExerciseAttemptByIdParamsType) {
        const userExerciseAttempt = await this.userExerciseAttemptRepository.findUnique({
            id: params.id
        })

        if (!userExerciseAttempt) {
            throw UserExerciseAttemptNotFoundException
        }

        return {
            data: userExerciseAttempt,
            message: USER_EXERCISE_ATTEMPT_MESSAGE.GET_SUCCESS
        }
    }

    async update(id: number, body: UpdateUserExerciseAttemptBodyType) {
        try {
            const userExerciseAttempt = await this.userExerciseAttemptRepository.update({ id }, body)

            return {
                data: userExerciseAttempt,
                message: USER_EXERCISE_ATTEMPT_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            if (isNotFoundPrismaError(error)) {
                throw UserExerciseAttemptNotFoundException
            }
            this.logger.error('Error updating user exercise attempt:', error)
            throw InvalidUserExerciseAttemptDataException
        }
    }

    async remove(id: number) {
        try {
            const userExerciseAttempt = await this.userExerciseAttemptRepository.delete({ id })

            return {
                data: userExerciseAttempt,
                message: USER_EXERCISE_ATTEMPT_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            if (isNotFoundPrismaError(error)) {
                throw UserExerciseAttemptNotFoundException
            }
            this.logger.error('Error deleting user exercise attempt:', error)
            throw InvalidUserExerciseAttemptDataException
        }
    }
}


