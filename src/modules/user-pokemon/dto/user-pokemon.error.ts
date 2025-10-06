import { USER_POKEMON_MESSAGE } from '@/common/constants/message'
import { UserPokemonMessage } from '@/i18n/message-keys'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

export class UserPokemonNotFoundException extends NotFoundException {
  constructor() {
    super({
      message: USER_POKEMON_MESSAGE.NOT_FOUND,
      errorKey: UserPokemonMessage.NOT_FOUND
    })
  }
}

export class NicknameAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: USER_POKEMON_MESSAGE.NICKNAME_ALREADY_EXISTS,
      errorKey: UserPokemonMessage.NICKNAME_ALREADY_EXISTS
    })
  }
}

export class ErrorInitLevelPokemonException extends BadRequestException {
  constructor() {
    super({
      message: USER_POKEMON_MESSAGE.ERROR_INIT_LEVEL,
      errorKey: UserPokemonMessage.ERROR_INIT_LEVEL
    })
  }
}

export class InvalidUserAccessPokemonException extends BadRequestException {
  constructor() {
    super({
      message: USER_POKEMON_MESSAGE.INVALID_ACCESS_POKEMON,
      errorKey: UserPokemonMessage.INVALID_ACCESS_POKEMON
    })
  }
}

export class InvalidNextPokemonException extends BadRequestException {
  constructor() {
    super({
      message: USER_POKEMON_MESSAGE.INVALID_NEXT_POKEMON,
      errorKey: UserPokemonMessage.INVALID_NEXT_POKEMON
    })
  }
}

export class CannotEvolveException extends BadRequestException {
  constructor() {
    super({
      message: USER_POKEMON_MESSAGE.CANNOT_EVOLVE,
      errorKey: UserPokemonMessage.CANNOT_EVOLVE
    })
  }
}

export class UserHasPokemonException extends ConflictException {
  constructor() {
    super({
      message: USER_POKEMON_MESSAGE.USER_HAS_POKEMON,
      errorKey: UserPokemonMessage.USER_HAS_POKEMON
    })
  }
}
