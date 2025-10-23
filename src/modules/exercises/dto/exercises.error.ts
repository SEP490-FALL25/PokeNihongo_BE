import { HttpException, HttpStatus } from '@nestjs/common'

export class ExercisesNotFoundException extends HttpException {
    constructor() {
        super('Không tìm thấy bài tập', HttpStatus.NOT_FOUND)
    }
}

export class ExercisesAlreadyExistsException extends HttpException {
    constructor() {
        super('Bài tập đã tồn tại', HttpStatus.CONFLICT)
    }
}

export class InvalidExercisesDataException extends HttpException {
    constructor(message: string) {
        super(message, HttpStatus.BAD_REQUEST)
    }
}

export class LessonNotFoundException extends HttpException {
    constructor() {
        super('Không tìm thấy bài học', HttpStatus.NOT_FOUND)
    }
}
