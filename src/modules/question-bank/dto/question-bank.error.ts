import { HttpException, HttpStatus } from '@nestjs/common'

export const QUESTION_BANK_MESSAGE = {
    NOT_FOUND: 'Không tìm thấy ngân hàng câu hỏi',
    ALREADY_EXISTS: 'Ngân hàng câu hỏi đã tồn tại',
    INVALID_DATA: 'Dữ liệu ngân hàng câu hỏi không hợp lệ',
    CREATE_SUCCESS: 'Tạo ngân hàng câu hỏi thành công',
    UPDATE_SUCCESS: 'Cập nhật ngân hàng câu hỏi thành công',
    DELETE_SUCCESS: 'Xóa ngân hàng câu hỏi thành công',
    GET_SUCCESS: 'Lấy thông tin ngân hàng câu hỏi thành công',
    GET_LIST_SUCCESS: 'Lấy danh sách ngân hàng câu hỏi thành công',
    GET_STATS_SUCCESS: 'Lấy thống kê ngân hàng câu hỏi thành công'
}

export const QuestionBankNotFoundException = new HttpException(
    {
        statusCode: HttpStatus.NOT_FOUND,
        message: QUESTION_BANK_MESSAGE.NOT_FOUND,
        error: 'QUESTION_BANK_NOT_FOUND'
    },
    HttpStatus.NOT_FOUND
)

export const QuestionBankAlreadyExistsException = new HttpException(
    {
        statusCode: HttpStatus.CONFLICT,
        message: QUESTION_BANK_MESSAGE.ALREADY_EXISTS,
        error: 'QUESTION_BANK_ALREADY_EXISTS'
    },
    HttpStatus.CONFLICT
)

export const InvalidQuestionBankDataException = new HttpException(
    {
        statusCode: HttpStatus.BAD_REQUEST,
        message: QUESTION_BANK_MESSAGE.INVALID_DATA,
        error: 'INVALID_QUESTION_BANK_DATA'
    },
    HttpStatus.BAD_REQUEST
)

