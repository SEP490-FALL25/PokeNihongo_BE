import { I18nService } from '@/i18n/i18n.service'
import { UserSeasonHistoryMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  convertEloToRank,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { NotStartedLeaderboardSeasonException } from '../leaderboard-season/dto/leaderboard-season.error'
import { LeaderboardSeasonRepo } from '../leaderboard-season/leaderboard-season.repo'
import { UserSeasonHistoryNotFoundException } from './dto/user-season-history.error'
import {
  CreateUserSeasonHistoryBodyType,
  UpdateUserSeasonHistoryBodyType
} from './entities/user-season-history.entity'
import { UserSeasonHistoryRepo } from './user-season-history.repo'

@Injectable()
export class UserSeasonHistoryService {
  constructor(
    private userSeasonHistoryRepo: UserSeasonHistoryRepo,
    private readonly leaderboardSeasonRepo: LeaderboardSeasonRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.userSeasonHistoryRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserSeasonHistoryMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const userSeasonHistory = await this.userSeasonHistoryRepo.findById(id)
    if (!userSeasonHistory) {
      throw new UserSeasonHistoryNotFoundException()
    }

    return {
      statusCode: 200,
      data: userSeasonHistory,
      message: this.i18nService.translate(UserSeasonHistoryMessage.GET_LIST_SUCCESS, lang)
    }
  }
  async joinSeason({ userId }: { userId: number }, lang: string = 'vi') {
    try {
      // lay season hien tai
      const currentSeason = await this.leaderboardSeasonRepo.findActiveSeason()
      if (!currentSeason) {
        throw new NotStartedLeaderboardSeasonException()
      }
      const result = await this.userSeasonHistoryRepo.create({
        createdById: userId,
        data: {
          userId,
          seasonId: currentSeason.id,
          finalElo: null,
          finalRank: ''
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(UserSeasonHistoryMessage.CREATE_SUCCESS, lang)
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

  async create(
    { userId, data }: { userId: number; data: CreateUserSeasonHistoryBodyType },
    lang: string = 'vi'
  ) {
    try {
      // check coi co truyen userId ko, neu ko thi lay cua created_by
      data.userId = data.userId || userId

      const rankName = convertEloToRank(data.finalElo || 0)
      data.finalRank = rankName

      const result = await this.userSeasonHistoryRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(UserSeasonHistoryMessage.CREATE_SUCCESS, lang)
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
      data: UpdateUserSeasonHistoryBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      if (data.finalElo !== undefined) {
        const rankName = convertEloToRank(data.finalElo || 0)
        data.finalRank = rankName
      }
      const userSeasonHistory = await this.userSeasonHistoryRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: userSeasonHistory,
        message: this.i18nService.translate(UserSeasonHistoryMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserSeasonHistoryNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existUserSeasonHistory = await this.userSeasonHistoryRepo.findById(id)
      if (!existUserSeasonHistory) {
        throw new UserSeasonHistoryNotFoundException()
      }

      await this.userSeasonHistoryRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserSeasonHistoryMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserSeasonHistoryNotFoundException()
      }
      throw error
    }
  }

  async getUserHisByUserId(userId: number, lang: string = 'vi') {
    const userSeasonHistory =
      await this.userSeasonHistoryRepo.findSeasonNowByUserId(userId)
    return {
      statusCode: 200,
      data: userSeasonHistory,
      message: this.i18nService.translate(UserSeasonHistoryMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getReward({ id, userId }: { id: number; userId: number }, lang: string = 'vi') {}
}
