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
