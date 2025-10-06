import { POKEMON_MESSAGE } from '@/common/constants/message'
import { PokemonMessage } from '@/i18n/message-keys'
import { ConflictException, NotFoundException } from '@nestjs/common'

export class PokemonNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: POKEMON_MESSAGE.NOT_FOUND,
      errorKey: PokemonMessage.NOT_FOUND
    })
  }
}

export class PokemonAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: POKEMON_MESSAGE.ALREADY_EXISTS,
      errorKey: PokemonMessage.ALREADY_EXISTS
    })
  }
}

export class InvalidEvolutionException extends ConflictException {
  constructor() {
    super({
      message: 'Evolution không hợp lệ - Pokemon evolution phải có level cao hơn',
      errorKey: PokemonMessage.INVALID_EVOLUTION
    })
  }
}

export class InvalidFormatException extends ConflictException {
  constructor() {
    super({
      message: 'Dữ liệu không đúng định dạng',
      errorKey: PokemonMessage.INVALID_FORMAT
    })
  }
}

export class NeedAtLeastOneTypeException extends ConflictException {
  constructor() {
    super({
      message: 'Pokemon phải có ít nhất một type',
      errorKey: PokemonMessage.NEED_AT_LEAST_ONE_TYPE
    })
  }
}
