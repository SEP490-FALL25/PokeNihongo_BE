import { MailService } from '@/3rdService/mail/mail.service'
import { I18nService } from '@/i18n/i18n.service'
import { UserMessage } from '@/i18n/message-keys'
import { LevelRepo } from '@/modules/level/level.repo'
import { UserPokemonRepo } from '@/modules/user-pokemon/user-pokemon.repo'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { UserStatus } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import { UserPokemonNotFoundException } from '../user-pokemon/dto/user-pokemon.error'
import { WalletService } from '../wallet/wallet.service'
import { EmailAlreadyExistsException, UserNotFoundException } from './dto/user.error'
import {
  CreateUserBodyType,
  SetMainPokemonBodyType,
  UpdateUserBodyType
} from './entities/user.entity'
import { UserRepo } from './user.repo'

@Injectable()
export class UserService {
  constructor(
    private userRepo: UserRepo,
    private mailService: MailService,
    private userPokemonRepo: UserPokemonRepo,
    private i18nService: I18nService,
    private levelRepo: LevelRepo,
    private walletSer: WalletService
  ) {}

  /**
   * Generate random password with 8 characters
   */
  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.userRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw new UserNotFoundException()
    }
    return {
      statusCode: 200,
      data: user,
      message: this.i18nService.translate(UserMessage.GET_DETAIL_SUCCESS, lang)
    }
  }

  async create(
    { data, createdById }: { data: CreateUserBodyType; createdById: number },
    lang: string = 'vi'
  ) {
    try {
      // Check if email already exists
      const existingUser = await this.userRepo.findByEmail(data.email)
      if (existingUser) {
        throw new EmailAlreadyExistsException()
      }

      // Generate random password
      const randomPassword = this.generateRandomPassword()

      // Hash password
      const hashedPassword = await bcrypt.hash(randomPassword, 10)

      const result = await this.userRepo.create({
        createdById,
        data: {
          ...data,
          password: hashedPassword,
          status: UserStatus.ACTIVE
        }
      })

      // Send email with password
      const emailLower = data.email.toLowerCase()
      const template = 'account'
      const content = 'TÀI KHOẢN CỦA BẠN ĐÃ ĐƯỢC TẠO: '
      const bodyContent = 'Vui lòng nhập EMAIL và PASSWORD để có thể đăng nhập.'
      console.log('password: ', randomPassword)

      await this.mailService.sendEmailPasswordAccount(
        emailLower,
        template,
        content,
        bodyContent,
        data.email,
        randomPassword
      )

      // Remove password from response
      const { password, ...userWithoutPassword } = result

      //tao wallet
      await this.walletSer.generateWalletByUserId(userWithoutPassword.id)

      return {
        statusCode: 201,
        data: userWithoutPassword,
        message: this.i18nService.translate(UserMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new EmailAlreadyExistsException()
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
      updatedById
    }: {
      id: number
      data: UpdateUserBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const existUser = await this.userRepo.findById(id)
      if (!existUser) {
        throw new UserNotFoundException()
      }

      let updateData = { ...data }

      // Kiểm tra password nếu có trong data
      if (data.password) {
        // Kiểm tra password mới có giống password cũ không
        const isSamePassword = await bcrypt.compare(data.password, existUser.password)

        if (isSamePassword) {
          // Password giống nhau, loại bỏ password khỏi update data
          const { password, ...dataWithoutPassword } = updateData
          updateData = dataWithoutPassword
        } else {
          // Password khác, hash password mới
          const hashedPassword = await bcrypt.hash(data.password, 10)
          updateData.password = hashedPassword
        }
      }

      const result = await this.userRepo.update({
        id,
        updatedById,
        data: updateData
      })

      // Remove password from response
      const { password, ...userWithoutPassword } = result

      return {
        statusCode: 200,
        data: userWithoutPassword,
        message: this.i18nService.translate(UserMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserNotFoundException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new EmailAlreadyExistsException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      const existUser = await this.userRepo.findById(id)
      if (!existUser) {
        throw new UserNotFoundException()
      }

      await this.userRepo.delete({
        id,
        deletedById
      })

      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserNotFoundException()
      }
      throw error
    }
  }

  async setMainPokemon(
    userId: number,
    data: SetMainPokemonBodyType,
    lang: string = 'vi'
  ) {
    try {
      // Check if user exists
      const user = await this.userRepo.findById(userId)
      if (!user) {
        throw new UserNotFoundException()
      }

      // Check if user owns this Pokemon
      const userPokemon = await this.userPokemonRepo.findByUserAndPokemon(
        userId,
        data.pokemonId
      )
      if (!userPokemon) {
        throw new UserPokemonNotFoundException()
      }

      // Unset main for all user's pokemon first
      await this.userPokemonRepo.unsetMainPokemon(userId)

      // Set the selected pokemon as main
      await this.userPokemonRepo.update({
        id: userPokemon.id,
        data: { isMain: true }
      })

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(UserMessage.SET_MAIN_POKEMON_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserNotFoundException()
      }
      throw error
    }
  }

  /**
   * Add experience to user and handle level up progression
   * Similar to Pokemon handleLevelUp logic but for user levels
   *
   * @param userId - User ID to add experience to
   * @param expToAdd - Amount of experience to add
   * @param lang - Language for response messages
   * @returns User level up result with details
   */
  async userAddExp(userId: number, expToAdd: number, lang: string = 'vi') {
    try {
      // Find user with current level
      const user = await this.userRepo.findById(userId)
      if (!user) {
        throw new UserNotFoundException()
      }

      // If user doesn't have a level, assign first user level
      if (!(user as any).level) {
        const firstLevel = await this.levelRepo.getFirstLevelUser()
        if (firstLevel) {
          await this.userRepo.update({
            id: userId,
            updatedById: userId,
            data: { levelId: firstLevel.id, exp: 0 }
          })
          // Reload user with level
          const updatedUser = await this.userRepo.findById(userId)
          if (updatedUser) {
            ;(user as any).level = (updatedUser as any).level
            user.levelId = updatedUser.levelId
          }
        }
      }

      const newTotalExp = user.exp + expToAdd
      const levelUpResult = await this.handleUserLevelUp(user, newTotalExp)

      return {
        statusCode: HttpStatus.OK,
        data: levelUpResult,
        message: this.i18nService.translate(UserMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserNotFoundException()
      }
      throw error
    }
  }

  /**
   * Handle user level up logic with recursive progression
   * Similar to Pokemon handleLevelUp but for user levels
   *
   * @param user - User object with current level
   * @param newExp - New total experience amount
   * @returns Level up result with progression details
   */
  private async handleUserLevelUp(user: any, newExp: number) {
    let currentLevel = (user as any).level
    let currentExp = newExp
    let leveledUp = false
    let levelsGained = 0
    let expUpdated = false

    // Keep checking for level ups while EXP is sufficient
    while (currentLevel && currentExp >= currentLevel.requiredExp) {
      // Find next level
      const nextLevel = await this.levelRepo.findByLevelAndType(
        currentLevel.levelNumber + 1,
        currentLevel.levelType as any
      )

      if (!nextLevel) {
        // No more levels available, keep remaining EXP
        await this.userRepo.update({
          id: user.id,
          updatedById: user.id,
          data: { exp: currentExp }
        })
        expUpdated = true
        break
      }

      // Level up! Calculate remaining EXP after leveling up
      const remainingExp = currentExp - currentLevel.requiredExp

      // Update user level and continue with remaining EXP
      await this.userRepo.update({
        id: user.id,
        updatedById: user.id,
        data: {
          levelId: nextLevel.id,
          exp: remainingExp
        }
      })

      currentLevel = nextLevel
      currentExp = remainingExp
      leveledUp = true
      levelsGained++
    }

    // If there's remaining EXP but no level up happened, just update EXP
    if (!leveledUp && !expUpdated) {
      await this.userRepo.update({
        id: user.id,
        updatedById: user.id,
        data: { exp: currentExp }
      })
    } else if (leveledUp && currentExp > 0 && currentLevel && !expUpdated) {
      // If leveled up but still has remaining EXP, ensure it doesn't exceed current level's requiredExp
      const finalExp = Math.min(currentExp, currentLevel.requiredExp)
      await this.userRepo.update({
        id: user.id,
        updatedById: user.id,
        data: { exp: finalExp }
      })
      currentExp = finalExp
    }

    // Get updated user data
    const updatedUser = await this.userRepo.findById(user.id)

    return {
      ...updatedUser,
      leveledUp,
      levelsGained,
      finalExp: currentExp
    }
  }

  /**
   * Add free coins to user
   * @param userId - User ID to add coins to
   * @param amount - Amount of coins to add
   * @param lang - Language for response messages
   */
  async addFreeCoins(userId: number, amount: number, lang: string = 'vi') {
    try {
      const user = await this.userRepo.findById(userId)
      if (!user) {
        throw new UserNotFoundException()
      }

      const updatedUser = await this.userRepo.incrementFreeCoins(userId, amount)

      return {
        statusCode: HttpStatus.OK,
        data: updatedUser,
        message: this.i18nService.translate(UserMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserNotFoundException()
      }
      throw error
    }
  }
}
