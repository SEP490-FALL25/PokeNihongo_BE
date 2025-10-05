import { USER_POKEMON_MESSAGE } from '@/common/constants/message'
import { ConflictException, NotFoundException } from '@nestjs/common'

export const UserPokemonNotFoundException = new NotFoundException({
  statusCode: 404,
  message: USER_POKEMON_MESSAGE.NOT_FOUND,
  error: 'Not Found'
})

export const NicknameAlreadyExistsException = new ConflictException({
  statusCode: 409,
  message: USER_POKEMON_MESSAGE.NICKNAME_ALREADY_EXISTS,
  error: 'Conflict'
})
