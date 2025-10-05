import { USER_POKEMON_MESSAGE } from '@/common/constants/message'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { LevelRepo } from '../level/level.repo'
import {
  NicknameAlreadyExistsException,
  UserPokemonNotFoundException
} from './dto/user-pokemon.error'
import {
  AddExpBodyType,
  CreateUserPokemonBodyType,
  UpdateUserPokemonBodyType
} from './entities/user-pokemon.entity'
import { UserPokemonRepo } from './user-pokemon.repo'

@Injectable()
export class UserPokemonService {
  constructor(
    private userPokemonRepo: UserPokemonRepo,
    private levelRepo: LevelRepo
  ) {}

  async list(pagination: PaginationQueryType, userId?: number) {
    const data = await this.userPokemonRepo.list(pagination, userId)
    return {
      statusCode: 200,
      data,
      message: USER_POKEMON_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async findById(id: number) {
    const userPokemon = await this.userPokemonRepo.findById(id)
    if (!userPokemon) {
      throw UserPokemonNotFoundException
    }
    return {
      statusCode: 200,
      data: userPokemon,
      message: USER_POKEMON_MESSAGE.GET_DETAIL_SUCCESS
    }
  }

  async create({ userId, data }: { userId: number; data: CreateUserPokemonBodyType }) {
    try {
      // Check if user already has this Pokemon
      const existingUserPokemon = await this.userPokemonRepo.findByUserAndPokemon(
        userId,
        data.pokemonId
      )
      if (existingUserPokemon) {
        throw new Error('User đã sở hữu Pokemon này')
      }

      // Check if nickname is already used by this user
      if (data.nickname) {
        const existingNickname = await this.userPokemonRepo.findByUserAndNickname(
          userId,
          data.nickname
        )
        if (existingNickname) {
          throw NicknameAlreadyExistsException
        }
      }

      // If no levelId provided, get the first Pokemon level
      if (!data.levelId) {
        const firstPokemonLevel = await this.levelRepo.getFirstLevelPokemon()
        if (firstPokemonLevel) {
          data.levelId = firstPokemonLevel.id
        }
      }

      const result = await this.userPokemonRepo.create({
        userId,
        data
      })
      return {
        statusCode: 201,
        data: result,
        message: USER_POKEMON_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw NicknameAlreadyExistsException
      }
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async update({
    id,
    data,
    userId
  }: {
    id: number
    data: UpdateUserPokemonBodyType
    userId?: number
  }) {
    try {
      const existUserPokemon = await this.userPokemonRepo.findById(id)
      if (!existUserPokemon) {
        throw UserPokemonNotFoundException
      }

      // Check if user owns this Pokemon (optional security check)
      if (userId && existUserPokemon.userId !== userId) {
        throw new Error('Bạn không có quyền cập nhật Pokemon này')
      }

      // Check if nickname is already used by this user
      if (data.nickname) {
        const existingNickname = await this.userPokemonRepo.findByUserAndNickname(
          existUserPokemon.userId,
          data.nickname
        )
        if (existingNickname && existingNickname.id !== id) {
          throw NicknameAlreadyExistsException
        }
      }

      const userPokemon = await this.userPokemonRepo.update({
        id,
        data
      })
      return {
        statusCode: 200,
        data: userPokemon,
        message: USER_POKEMON_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw UserPokemonNotFoundException
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw NicknameAlreadyExistsException
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }) {
    try {
      const existUserPokemon = await this.userPokemonRepo.findById(id)
      if (!existUserPokemon) {
        throw UserPokemonNotFoundException
      }

      // Check if user owns this Pokemon (optional security check)
      if (userId && existUserPokemon.userId !== userId) {
        throw new Error('Bạn không có quyền xóa Pokemon này')
      }

      await this.userPokemonRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: USER_POKEMON_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw UserPokemonNotFoundException
      }
      throw error
    }
  }

  async getUserPokemons(userId: number) {
    const data = await this.userPokemonRepo.getUserPokemons(userId)
    return {
      statusCode: 200,
      data,
      message: 'Lấy danh sách Pokemon của người dùng thành công'
    }
  }

  async addExp(id: number, data: AddExpBodyType, userId?: number) {
    try {
      const existUserPokemon = await this.userPokemonRepo.findById(id)
      if (!existUserPokemon) {
        throw UserPokemonNotFoundException
      }

      // Check if user owns this Pokemon (optional security check)
      if (userId && existUserPokemon.userId !== userId) {
        throw new Error('Bạn không có quyền cập nhật Pokemon này')
      }

      const updatedUserPokemon = await this.userPokemonRepo.addExp(id, data.expAmount)

      // Check if Pokemon should level up
      const currentLevel = existUserPokemon.level
      const newExp = existUserPokemon.exp + data.expAmount

      if (currentLevel && newExp >= currentLevel.requiredExp) {
        // Find next level
        const nextLevel = await this.levelRepo.findByLevelAndType(
          currentLevel.levelNumber + 1,
          currentLevel.levelType as any
        )

        if (nextLevel) {
          // Level up
          await this.userPokemonRepo.levelUp(id, nextLevel.id)
          return {
            statusCode: 200,
            data: { leveledUp: true, newLevel: nextLevel },
            message: 'Pokemon đã lên cấp!'
          }
        }
      }

      return {
        statusCode: 200,
        data: updatedUserPokemon,
        message: 'Thêm EXP thành công'
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw UserPokemonNotFoundException
      }
      throw error
    }
  }
}
