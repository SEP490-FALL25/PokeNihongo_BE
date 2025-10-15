import { HttpException, HttpStatus } from '@nestjs/common'

export const USER_EXERCISE_ATTEMPT_MESSAGE = {
    NOT_FOUND: 'Không tìm thấy lần thử bài tập',
    ALREADY_EXISTS: 'Lần thử bài tập đã tồn tại',
    INVALID_DATA: 'Dữ liệu lần thử bài tập không hợp lệ',
    CREATE_SUCCESS: 'Tạo lần thử bài tập thành công',
    UPDATE_SUCCESS: 'Cập nhật lần thử bài tập thành công',
    DELETE_SUCCESS: 'Xóa lần thử bài tập thành công',
    GET_SUCCESS: 'Lấy thông tin lần thử bài tập thành công',
    GET_LIST_SUCCESS: 'Lấy danh sách lần thử bài tập thành công'
}

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


