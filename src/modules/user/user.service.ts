import { MailService } from '@/3rdService/mail/mail.service'
import { I18nService } from '@/i18n/i18n.service'
import { UserMessage } from '@/i18n/message-keys'
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
    private i18nService: I18nService
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
}
