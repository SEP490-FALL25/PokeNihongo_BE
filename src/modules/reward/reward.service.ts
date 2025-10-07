import { I18nService } from '@/i18n/i18n.service'
import { RewardMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { RewardAlreadyExistsException } from './dto/reward.error'
import { CreateRewardBodyType, UpdateRewardBodyType } from './entities/reward.entity'
import { RewardRepo } from './reward.repo'

@Injectable()
export class RewardService {
  constructor(
    private rewardRepo: RewardRepo,
    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.rewardRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(RewardMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const reward = await this.rewardRepo.findById(id)
    if (!reward) {
      throw new NotFoundRecordException()
    }
    return {
      data: reward,
      message: this.i18nService.translate(RewardMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateRewardBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.rewardRepo.create({
        createdById,
        data
      })
      return {
        data: result,
        message: this.i18nService.translate(RewardMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new RewardAlreadyExistsException()
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
      data: UpdateRewardBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const reward = await this.rewardRepo.update({
        id,
        updatedById,
        data
      })
      return {
        data: reward,
        message: this.i18nService.translate(RewardMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new RewardAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.rewardRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(RewardMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
