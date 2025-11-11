import { I18nService } from '@/i18n/i18n.service'
import { UserAchievementMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { UserAchievementNotFoundException } from './dto/user-achievement.error'
import {
  CreateUserAchievementBodyType,
  UpdateUserAchievementBodyType
} from './entities/user-achievement.entity'
import { UserAchievementRepo } from './user-achievement.repo'

@Injectable()
export class UserAchievementService {
  constructor(
    private userAchievementRepo: UserAchievementRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.userAchievementRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserAchievementMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const userAchievement = await this.userAchievementRepo.findById(id)
    if (!userAchievement) {
      throw new UserAchievementNotFoundException()
    }

    return {
      statusCode: 200,
      data: userAchievement,
      message: this.i18nService.translate(UserAchievementMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateUserAchievementBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.userAchievementRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(UserAchievementMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
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
      data: UpdateUserAchievementBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const userAchievement = await this.userAchievementRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: userAchievement,
        message: this.i18nService.translate(UserAchievementMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserAchievementNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existUserAchievement = await this.userAchievementRepo.findById(id)
      if (!existUserAchievement) {
        throw new UserAchievementNotFoundException()
      }

      await this.userAchievementRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserAchievementMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserAchievementNotFoundException()
      }
      throw error
    }
  }
}
