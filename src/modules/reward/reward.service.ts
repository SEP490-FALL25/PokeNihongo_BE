import { REWARD_MESSAGE } from '@/common/constants/message'
import { NotFoundRecordException } from '@/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { RewardAlreadyExistsException } from './dto/reward.error'
import { CreateRewardBodyType, UpdateRewardBodyType } from './entities/reward.entity'
import { RewardRepo } from './reward.repo'

@Injectable()
export class RewardService {
  constructor(private rewardRepo: RewardRepo) {}

  async list(pagination: PaginationQueryType) {
    const data = await this.rewardRepo.list(pagination)
    return {
      data,
      message: REWARD_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async findById(id: number) {
    const reward = await this.rewardRepo.findById(id)
    if (!reward) {
      throw NotFoundRecordException
    }
    return {
      data: reward,
      message: 'Lấy danh mục thành công'
    }
  }

  async create({
    data,
    createdById
  }: {
    data: CreateRewardBodyType
    createdById: number
  }) {
    try {
      const result = await this.rewardRepo.create({
        createdById,
        data
      })
      return {
        data: result,
        message: REWARD_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw RewardAlreadyExistsException
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
    data: UpdateRewardBodyType
    updatedById: number
  }) {
    try {
      const reward = await this.rewardRepo.update({
        id,
        updatedById,
        data
      })
      return {
        data: reward,
        message: REWARD_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw RewardAlreadyExistsException
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      await this.rewardRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: REWARD_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }
}
