import { USER_POKEMON_MESSAGE } from '@/common/constants/message'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'

export const UserPokemonNotFoundException = new NotFoundException(
  USER_POKEMON_MESSAGE.NOT_FOUND
)

export const NicknameAlreadyExistsException = new ConflictException(
  USER_POKEMON_MESSAGE.NICKNAME_ALREADY_EXISTS
)

export const ErrorInitLevelPokemonException = new BadRequestException(
  USER_POKEMON_MESSAGE.ERROR_INIT_LEVEL
)

export const InvalidUserAccessPokemonException = new BadRequestException(
  USER_POKEMON_MESSAGE.INVALID_ACCESS_POKEMON
)

export const InvalidNextPokemonException = new BadRequestException(
  USER_POKEMON_MESSAGE.INVALID_NEXT_POKEMON
)

export const CannotEvolveException = new BadRequestException(
  USER_POKEMON_MESSAGE.CANNOT_EVOLVE
)
