import { HttpException, HttpStatus } from '@nestjs/common'

export const KanjiNotFoundException = new HttpException(
    {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Kanji không tồn tại',
        error: 'KANJI_NOT_FOUND'
    },
    HttpStatus.NOT_FOUND
)

export const KanjiAlreadyExistsException = new HttpException(
    {
        statusCode: HttpStatus.CONFLICT,
        message: 'Kanji đã tồn tại',
        error: 'KANJI_ALREADY_EXISTS'
    },
    HttpStatus.CONFLICT
)

export const InvalidKanjiDataException = new HttpException(
    {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Dữ liệu Kanji không hợp lệ',
        error: 'INVALID_KANJI_DATA'
    },
    HttpStatus.BAD_REQUEST
)

