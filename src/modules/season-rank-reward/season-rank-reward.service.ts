import { I18nService } from '@/i18n/i18n.service'
import { SeasonRankRewardMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { LeaderboardSeasonRepo } from '../leaderboard-season/leaderboard-season.repo'
import { SeasonRankRewardNotFoundException } from './dto/season-rank-reward.error'
import {
  CreateSeasonRankRewardBodyType,
  UpdateSeasonRankRewardBodyType
} from './entities/season-rank-reward.entity'
import { SeasonRankRewardRepo } from './season-rank-reward.repo'

@Injectable()
export class SeasonRankRewardService {
  constructor(
    private seasonRankRewardRepo: SeasonRankRewardRepo,
    private readonly leaderboardSeasonRepo: LeaderboardSeasonRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.seasonRankRewardRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(SeasonRankRewardMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const seasonRankReward = await this.seasonRankRewardRepo.findById(id)
    if (!seasonRankReward) {
      throw new SeasonRankRewardNotFoundException()
    }

    return {
      statusCode: 200,
      data: seasonRankReward,
      message: this.i18nService.translate(SeasonRankRewardMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateSeasonRankRewardBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.seasonRankRewardRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(SeasonRankRewardMessage.CREATE_SUCCESS, lang)
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
      data: UpdateSeasonRankRewardBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const seasonRankReward = await this.seasonRankRewardRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: seasonRankReward,
        message: this.i18nService.translate(SeasonRankRewardMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new SeasonRankRewardNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existSeasonRankReward = await this.seasonRankRewardRepo.findById(id)
      if (!existSeasonRankReward) {
        throw new SeasonRankRewardNotFoundException()
      }

      await this.seasonRankRewardRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(SeasonRankRewardMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new SeasonRankRewardNotFoundException()
      }
      throw error
    }
  }
}
