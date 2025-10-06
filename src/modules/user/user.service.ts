import { MailService } from '@/3rdService/mail/mail.service'
import { USER_MESSAGE } from '@/common/constants/message'
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
    private userPokemonRepo: UserPokemonRepo
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

  async list(pagination: PaginationQueryType) {
    const data = await this.userRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: USER_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async findById(id: number) {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw UserNotFoundException
    }
    return {
      statusCode: 200,
      data: user,
      message: USER_MESSAGE.GET_DETAIL_SUCCESS
    }
  }

  async create({ data, createdById }: { data: CreateUserBodyType; createdById: number }) {
    try {
      // Check if email already exists
      const existingUser = await this.userRepo.findByEmail(data.email)
      if (existingUser) {
        throw EmailAlreadyExistsException
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
        message: USER_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw EmailAlreadyExistsException
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
    updatedById
  }: {
    id: number
    data: UpdateUserBodyType
    updatedById: number
  }) {
    try {
      const existUser = await this.userRepo.findById(id)
      if (!existUser) {
        throw UserNotFoundException
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
        message: USER_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw UserNotFoundException
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw EmailAlreadyExistsException
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      const existUser = await this.userRepo.findById(id)
      if (!existUser) {
        throw UserNotFoundException
      }

      await this.userRepo.delete({
        id,
        deletedById
      })

      return {
        statusCode: 200,
        data: null,
        message: USER_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw UserNotFoundException
      }
      throw error
    }
  }

  async setMainPokemon(userId: number, data: SetMainPokemonBodyType) {
    try {
      // Check if user exists
      const user = await this.userRepo.findById(userId)
      if (!user) {
        throw UserNotFoundException
      }

      // Check if user owns this Pokemon
      const userPokemon = await this.userPokemonRepo.findByUserAndPokemon(
        userId,
        data.pokemonId
      )
      if (!userPokemon) {
        throw UserPokemonNotFoundException
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
        message: USER_MESSAGE.SET_MAIN_POKEMON_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw UserNotFoundException
      }
      throw error
    }
  }
}
