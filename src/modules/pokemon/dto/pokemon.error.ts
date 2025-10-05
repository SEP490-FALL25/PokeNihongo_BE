import { POKEMON_MESSAGE } from '@/common/constants/message'
import { ConflictException, NotFoundException } from '@nestjs/common'

export const PokemonNotFoundException = new NotFoundException(POKEMON_MESSAGE.NOT_FOUND)

export const PokemonAlreadyExistsException = new ConflictException(
  POKEMON_MESSAGE.ALREADY_EXISTS
)

export const InvalidEvolutionException = new ConflictException(
  'Evolution không hợp lệ - Pokemon evolution phải có level cao hơn'
)
