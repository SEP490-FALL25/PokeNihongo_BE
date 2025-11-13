import { FlashcardMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

export class FlashcardDeckNotFoundException extends NotFoundException {
    constructor() {
        super({
            message: FlashcardMessage.NOT_FOUND_DECK,
            errorKey: FlashcardMessage.NOT_FOUND_DECK
        })
    }
}

export class FlashcardCardNotFoundException extends NotFoundException {
    constructor() {
        super({
            message: FlashcardMessage.NOT_FOUND_CARD,
            errorKey: FlashcardMessage.NOT_FOUND_CARD
        })
    }
}

export class FlashcardContentAlreadyExistsException extends ConflictException {
    constructor() {
        super({
            message: FlashcardMessage.CONTENT_ALREADY_IN_DECK,
            errorKey: FlashcardMessage.CONTENT_ALREADY_IN_DECK
        })
    }
}

export class InvalidFlashcardContentTypeException extends BadRequestException {
    constructor() {
        super({
            message: FlashcardMessage.INVALID_CONTENT_TYPE,
            errorKey: FlashcardMessage.INVALID_CONTENT_TYPE
        })
    }
}

export class InvalidFlashcardImportException extends BadRequestException {
    constructor() {
        super({
            message: FlashcardMessage.INVALID_IMPORT_IDS,
            errorKey: FlashcardMessage.INVALID_IMPORT_IDS
        })
    }
}

