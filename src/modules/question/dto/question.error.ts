import { HttpException, HttpStatus } from '@nestjs/common'

export class QuestionNotFoundException extends HttpException {
    constructor() {
        super('Không tìm thấy câu hỏi', HttpStatus.NOT_FOUND)
    }
}

export class QuestionAlreadyExistsException extends HttpException {
    constructor() {
        super('Câu hỏi đã tồn tại', HttpStatus.CONFLICT)
    }
}

export class QuestionContentAlreadyExistsException extends HttpException {
    constructor() {
        super('Câu hỏi này đã tồn tại trong bài tập', HttpStatus.CONFLICT)
    }
}

export class InvalidJapaneseContentException extends HttpException {
    constructor() {
        super('Câu hỏi phải chứa ít nhất một ký tự tiếng Nhật (Hiragana, Katakana, hoặc Kanji)', HttpStatus.BAD_REQUEST)
    }
}

export class InvalidQuestionDataException extends HttpException {
    constructor(message: string) {
        super(message, HttpStatus.BAD_REQUEST)
    }
}

export class ExercisesNotFoundException extends HttpException {
    constructor() {
        super('Không tìm thấy bài tập', HttpStatus.NOT_FOUND)
    }
}
