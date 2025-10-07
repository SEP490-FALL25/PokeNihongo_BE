import { I18nService } from '@/i18n/i18n.service'
import { UserPokemonMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { Injectable } from '@nestjs/common'
import { LevelRepo } from '../level/level.repo'
import { PokemonRepo } from '../pokemon/pokemon.repo'
import {
  CannotEvolveException,
  ErrorInitLevelPokemonException,
  InvalidNextPokemonException,
  InvalidUserAccessPokemonException,
  NicknameAlreadyExistsException,
  UserHasPokemonException,
  UserPokemonNotFoundException
} from './dto/user-pokemon.error'
import {
  AddExpBodyType,
  CreateUserPokemonBodyType,
  EvolvePokemonBodyType,
  UpdateUserPokemonBodyType
} from './entities/user-pokemon.entity'
import { UserPokemonRepo } from './user-pokemon.repo'

@Injectable()
export class UserPokemonService {
  constructor(
    private userPokemonRepo: UserPokemonRepo,
    private levelRepo: LevelRepo,
    private pokemonRepo: PokemonRepo,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, userId?: number, lang: string = 'vi') {
    const data = await this.userPokemonRepo.list(pagination, userId)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const userPokemon = await this.userPokemonRepo.findById(id)
    if (!userPokemon) {
      throw new UserPokemonNotFoundException()
    }
    return {
      statusCode: 200,
      data: userPokemon,
      message: this.i18nService.translate(UserPokemonMessage.GET_DETAIL_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateUserPokemonBodyType },
    lang: string = 'vi'
  ) {
    try {
      // Get user check is first pokemon
      const user = await this.sharedUserRepository.findUnique({ id: userId })
      let isFirstPokemon = false

      if (user?.levelId === null) {
        const firstLevelUser = await this.levelRepo.getFirstLevelUser()
        if (!firstLevelUser) {
          throw new ErrorInitLevelPokemonException()
        }
        await this.sharedUserRepository.addLevelForUser(userId, firstLevelUser.id)
        isFirstPokemon = true
      }

      // Check if user already has this Pokemon
      const existingUserPokemon = await this.userPokemonRepo.findByUserAndPokemon(
        userId,
        data.pokemonId
      )
      if (existingUserPokemon) {
        throw new UserHasPokemonException()
      }

      // Check if nickname is already used by this user
      if (data.nickname) {
        const existingNickname = await this.userPokemonRepo.findByUserAndNickname(
          userId,
          data.nickname
        )
        if (existingNickname) {
          throw new NicknameAlreadyExistsException()
        }
      }

      // If no levelId provided, get the first Pokemon level
      const firstPokemonLevel = await this.levelRepo.getFirstLevelPokemon()
      if (!firstPokemonLevel) {
        throw new ErrorInitLevelPokemonException()
      }

      const result = await this.userPokemonRepo.create({
        userId,
        data: {
          ...data,
          levelId: firstPokemonLevel.id,
          isMain: isFirstPokemon // Set isMain = true nếu là Pokemon đầu tiên
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(UserPokemonMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new NicknameAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: UpdateUserPokemonBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const existUserPokemon = await this.userPokemonRepo.findById(id)
      if (!existUserPokemon) {
        throw new UserPokemonNotFoundException()
      }

      // Check if user owns this Pokemon (optional security check)
      if (userId && existUserPokemon.userId !== userId) {
        throw new InvalidUserAccessPokemonException()
      }

      // Check if nickname is already used by this user
      if (data.nickname) {
        const existingNickname = await this.userPokemonRepo.findByUserAndNickname(
          existUserPokemon.userId,
          data.nickname
        )
        if (existingNickname && existingNickname.id !== id) {
          throw new NicknameAlreadyExistsException()
        }
      }

      // Check if isMain is set to true
      if (data.isMain === true) {
        // Unset isMain for all other user's pokemon
        await this.userPokemonRepo.unsetMainPokemon(existUserPokemon.userId)
      }

      const { exp, ...updateData } = data
      const userPokemon = await this.userPokemonRepo.update({
        id,
        data: updateData
      })
      return {
        statusCode: 200,
        data: userPokemon,
        message: this.i18nService.translate(UserPokemonMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserPokemonNotFoundException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new NicknameAlreadyExistsException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existUserPokemon = await this.userPokemonRepo.findById(id)
      if (!existUserPokemon) {
        throw new UserPokemonNotFoundException()
      }

      // Check if user owns this Pokemon (optional security check)
      if (userId && existUserPokemon.userId !== userId) {
        throw new InvalidUserAccessPokemonException()
      }

      await this.userPokemonRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserPokemonMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserPokemonNotFoundException()
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

  async addExp(id: number, data: AddExpBodyType, userId?: number, lang: string = 'vi') {
    try {
      const existUserPokemon = await this.userPokemonRepo.findById(id)
      if (!existUserPokemon) {
        throw new UserPokemonNotFoundException()
      }

      // Check if user owns this Pokemon (optional security check)
      if (userId && existUserPokemon.userId !== userId) {
        throw new InvalidUserAccessPokemonException()
      }

      // Calculate new EXP
      const newTotalExp = existUserPokemon.exp + data.expAmount

      // Handle level up logic
      const levelUpResult = await this.handleLevelUp(existUserPokemon, newTotalExp)

      return {
        statusCode: 200,
        data: levelUpResult,
        message: this.i18nService.translate(
          levelUpResult.leveledUp
            ? UserPokemonMessage.LEVEL_UP_SUCCESS
            : UserPokemonMessage.ADD_EXP_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserPokemonNotFoundException()
      }
      throw error
    }
  }

  /**
   * Handle level up logic with recursive checking
   *
   * Logic:
   * 1. Kiểm tra exp hiện tại + exp được thêm >= requiredExp của level hiện tại
   * 2. Nếu chưa đủ: chỉ update exp
   * 3. Nếu đủ:
   *    - Tìm level kế tiếp
   *    - Nếu không có level kế tiếp: set exp = requiredExp của level hiện tại (max level)
   *    - Nếu có level kế tiếp: level up và tiếp tục kiểm tra với exp dư
   * 4. Lặp lại cho đến khi không thể level up nữa
   *
   * Ví dụ:
   * - Level 1 cần 100 exp, Level 2 cần 200 exp, Level 3 cần 400 exp
   * - Pokemon có 80 exp level 1, thêm 250 exp
   * - Tổng: 330 exp
   * - Level 1→2: 330-100=230 exp dư, level up thành level 2
   * - Level 2→3: 230>=200, 230-200=30 exp dư, level up thành level 3
   * - Kết quả: Level 3 với 30 exp
   */
  private async handleLevelUp(userPokemon: any, newExp: number) {
    let currentLevel = userPokemon.level
    let currentExp = newExp
    let leveledUp = false
    let levelsGained = 0
    let expUpdated = false // Flag to track if EXP was already updated

    // Get Pokemon condition level for level cap
    const pokemonConditionLevel = userPokemon.pokemon?.conditionLevel

    // Keep checking for level ups while EXP is sufficient
    while (currentLevel && currentExp >= currentLevel.requiredExp) {
      // Check if Pokemon has reached its condition level limit
      if (pokemonConditionLevel && currentLevel.levelNumber >= pokemonConditionLevel) {
        // Pokemon has reached max allowed level, keep remaining EXP
        await this.userPokemonRepo.update({
          id: userPokemon.id,
          data: { exp: currentExp }
        })
        expUpdated = true
        break
      }

      // Find next level
      const nextLevel = await this.levelRepo.findByLevelAndType(
        currentLevel.levelNumber + 1,
        currentLevel.levelType as any
      )

      if (!nextLevel) {
        await this.userPokemonRepo.update({
          id: userPokemon.id,
          data: { exp: currentExp }
        })
        expUpdated = true
        break
      }

      // Level up! Calculate remaining EXP after leveling up
      const remainingExp = currentExp - currentLevel.requiredExp
      await this.userPokemonRepo.levelUp(userPokemon.id, nextLevel.id)

      currentLevel = nextLevel
      currentExp = remainingExp
      leveledUp = true
      levelsGained++
    }

    // If there's remaining EXP but no level up happened, just update EXP
    if (!leveledUp && !expUpdated) {
      await this.userPokemonRepo.update({
        id: userPokemon.id,
        data: { exp: currentExp }
      })
    } else if (leveledUp && currentExp > 0 && currentLevel && !expUpdated) {
      // If leveled up but still has remaining EXP, ensure it doesn't exceed current level's requiredExp
      const finalExp = Math.min(currentExp, currentLevel.requiredExp)
      await this.userPokemonRepo.update({
        id: userPokemon.id,
        data: { exp: finalExp }
      })
      currentExp = finalExp
    }

    // Get updated Pokemon data
    const updatedUserPokemon = await this.userPokemonRepo.findById(userPokemon.id)

    return {
      ...updatedUserPokemon,
      leveledUp,
      levelsGained,
      finalExp: currentExp
    }
  }

  /**
   * Evolve Pokemon - Create new evolved Pokemon and transfer EXP
   */
  async evolvePokemon(
    userPokemonId: number,
    data: EvolvePokemonBodyType,
    userId: number,
    lang: string = 'vi'
  ) {
    try {
      // Get current user pokemon
      const currentUserPokemon = await this.userPokemonRepo.findById(userPokemonId)
      if (!currentUserPokemon) {
        throw new UserPokemonNotFoundException()
      }

      // Check ownership
      if (currentUserPokemon.userId !== userId) {
        throw new InvalidUserAccessPokemonException()
      }

      // Check if Pokemon has already evolved
      if (currentUserPokemon.isEvolved) {
        throw new CannotEvolveException()
      }

      // Verify evolution is possible
      const currentPokemon = await this.pokemonRepo.findById(currentUserPokemon.pokemonId)
      if (!currentPokemon || !currentPokemon.nextPokemons) {
        throw new NotFoundRecordException()
      }

      // Check if nextPokemonId is valid evolution option
      const isValidEvolution = currentPokemon.nextPokemons?.some(
        (nextPokemon: any) => nextPokemon.id === data.nextPokemonId
      )
      if (!isValidEvolution) {
        throw new InvalidNextPokemonException()
      }

      // Check if user already has this evolved Pokemon
      const existingEvolvedPokemon = await this.userPokemonRepo.findByUserAndPokemon(
        userId,
        data.nextPokemonId
      )
      if (existingEvolvedPokemon) {
        throw new InvalidNextPokemonException()
      }

      // Get current EXP to transfer
      const currentExp = currentUserPokemon.exp
      const currentLevel = currentUserPokemon.level

      // Create new evolved Pokemon with level 1
      const firstPokemonLevel = await this.levelRepo.getFirstLevelPokemon()
      if (!firstPokemonLevel) {
        throw new ErrorInitLevelPokemonException()
      }

      const newUserPokemon = await this.userPokemonRepo.create({
        userId,
        data: {
          pokemonId: data.nextPokemonId,
          levelId: firstPokemonLevel.id,
          nickname: null
        }
      })

      const updateOldPokemon = await this.userPokemonRepo.update({
        id: currentUserPokemon.id,
        data: { isEvolved: true }
      })

      // Transfer EXP and handle level ups for evolved Pokemon
      // Set the current exp first, then handle level up
      await this.userPokemonRepo.update({
        id: newUserPokemon.id,
        data: { exp: currentExp }
      })

      // Reload Pokemon with updated EXP and level info
      const reloadedNewPokemon = await this.userPokemonRepo.findById(newUserPokemon.id)

      // Handle level ups based on transferred EXP
      console.log('Transferred EXP:', currentExp)

      const levelUpResult = await this.handleLevelUp(reloadedNewPokemon, currentExp)

      // Reset original Pokemon's EXP to 0
      await this.userPokemonRepo.update({
        id: userPokemonId,
        data: { exp: 0 }
      })

      return {
        statusCode: 200,
        data: {
          newUserPokemon: levelUpResult,
          transferredExp: currentExp,
          message: this.i18nService.translate(UserPokemonMessage.EVOLVE_SUCCESS, lang)
        },
        message: this.i18nService.translate(UserPokemonMessage.EVOLVE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserPokemonNotFoundException()
      }
      throw error
    }
  }
}
