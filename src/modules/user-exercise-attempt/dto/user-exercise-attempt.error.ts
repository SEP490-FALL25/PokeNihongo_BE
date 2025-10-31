import { HttpException, HttpStatus } from '@nestjs/common'
import { USER_EXERCISE_ATTEMPT_MESSAGE } from '@/common/constants/message'

export const UserExerciseAttemptNotFoundException = new HttpException(
    {
        statusCode: HttpStatus.NOT_FOUND,
        message: USER_EXERCISE_ATTEMPT_MESSAGE.NOT_FOUND,
        error: 'USER_EXERCISE_ATTEMPT_NOT_FOUND'
    },
    HttpStatus.NOT_FOUND
)

export const UserExerciseAttemptAlreadyExistsException = new HttpException(
    {
        statusCode: HttpStatus.CONFLICT,
        message: USER_EXERCISE_ATTEMPT_MESSAGE.ALREADY_EXISTS,
        error: 'USER_EXERCISE_ATTEMPT_ALREADY_EXISTS'
    },
    HttpStatus.CONFLICT
)

export const InvalidUserExerciseAttemptDataException = new HttpException(
    {
        statusCode: HttpStatus.BAD_REQUEST,
        message: USER_EXERCISE_ATTEMPT_MESSAGE.INVALID_DATA,
        error: 'INVALID_USER_EXERCISE_ATTEMPT_DATA'
    },
    HttpStatus.BAD_REQUEST
)

export const ExerciseNotFoundException = new HttpException(
    {
        statusCode: HttpStatus.NOT_FOUND,
        message: USER_EXERCISE_ATTEMPT_MESSAGE.EXERCISE_NOT_FOUND,
        error: 'EXERCISE_NOT_FOUND'
    },
    HttpStatus.NOT_FOUND
)

export const LessonBlockedException = new HttpException(
    {
        statusCode: HttpStatus.BAD_REQUEST,
        message: USER_EXERCISE_ATTEMPT_MESSAGE.LESSON_BLOCKED,
        error: 'LESSON_BLOCKED'
    },
    HttpStatus.BAD_REQUEST
)

export const ExerciseAlreadyCompletedException = new HttpException(
    {
        statusCode: HttpStatus.CONFLICT,
        message: USER_EXERCISE_ATTEMPT_MESSAGE.EXERCISE_COMPLETED,
        error: 'EXERCISE_ALREADY_COMPLETED'
    },
    HttpStatus.CONFLICT
)

export const ExerciseAbandonedException = new HttpException(
    {
        statusCode: HttpStatus.CONFLICT,
        message: USER_EXERCISE_ATTEMPT_MESSAGE.EXERCISE_ABANDONED,
        error: 'EXERCISE_ABANDONED'
    },
    HttpStatus.CONFLICT
)

export const ForbiddenReviewAccessException = new HttpException(
    {
        statusCode: HttpStatus.FORBIDDEN,
        message: USER_EXERCISE_ATTEMPT_MESSAGE.FORBIDDEN_REVIEW_ACCESS,
        error: 'FORBIDDEN_REVIEW_ACCESS'
    },
    HttpStatus.FORBIDDEN
)