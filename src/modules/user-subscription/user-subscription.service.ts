import { I18nService } from '@/i18n/i18n.service'
import { UserSubscriptionMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { UserSubscriptionNotFoundException } from './dto/user-subscription.error'
import {
  CreateUserSubscriptionBodyType,
  UpdateUserSubscriptionBodyType
} from './entities/user-subscription.entity'
import { UserSubscriptionRepo } from './user-subscription.repo'

@Injectable()
export class UserSubscriptionService {
  constructor(
    private userSubscriptionRepo: UserSubscriptionRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.userSubscriptionRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserSubscriptionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const userSubscription = await this.userSubscriptionRepo.findById(id)
    if (!userSubscription) {
      throw new UserSubscriptionNotFoundException()
    }

    return {
      statusCode: 200,
      data: userSubscription,
      message: this.i18nService.translate(UserSubscriptionMessage.GET_LIST_SUCCESS, lang)
    }
  }
  async create(
    { userId, data }: { userId: number; data: CreateUserSubscriptionBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.userSubscriptionRepo.create({
        createdById: userId,
        data: {
          ...data,
          userId
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(UserSubscriptionMessage.CREATE_SUCCESS, lang)
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
      data: UpdateUserSubscriptionBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const userSubscription = await this.userSubscriptionRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: userSubscription,
        message: this.i18nService.translate(UserSubscriptionMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserSubscriptionNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existUserSubscription = await this.userSubscriptionRepo.findById(id)
      if (!existUserSubscription) {
        throw new UserSubscriptionNotFoundException()
      }

      await this.userSubscriptionRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserSubscriptionMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserSubscriptionNotFoundException()
      }
      throw error
    }
  }
}
