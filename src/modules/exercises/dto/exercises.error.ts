import { HttpException, HttpStatus } from '@nestjs/common'
import { EXERCISES_MESSAGE } from '@/common/constants/message'

export const ExercisesNotFoundException = new HttpException(
    {
        statusCode: HttpStatus.NOT_FOUND,
        message: EXERCISES_MESSAGE.NOT_FOUND,
        error: 'EXERCISES_NOT_FOUND'
    },
    HttpStatus.NOT_FOUND
)

export const ExercisesAlreadyExistsException = new HttpException(
    {
        statusCode: HttpStatus.CONFLICT,
        message: EXERCISES_MESSAGE.ALREADY_EXISTS,
        error: 'EXERCISES_ALREADY_EXISTS'
    },
    HttpStatus.CONFLICT
)

export const InvalidExercisesDataException = new HttpException(
    {
        statusCode: HttpStatus.BAD_REQUEST,
        message: EXERCISES_MESSAGE.INVALID_DATA,
        error: 'INVALID_EXERCISES_DATA'
    },
    HttpStatus.BAD_REQUEST
)

export const LessonNotFoundException = new HttpException(
    {
        statusCode: HttpStatus.NOT_FOUND,
        message: EXERCISES_MESSAGE.LESSON_NOT_FOUND,
        error: 'LESSON_NOT_FOUND'
    },
    HttpStatus.NOT_FOUND
)