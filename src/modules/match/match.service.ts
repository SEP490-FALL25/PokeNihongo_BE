import { I18nService } from '@/i18n/i18n.service'
import { MatchMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { LanguagesRepository } from '../languages/languages.repo'
import { LeaderboardSeasonRepo } from '../leaderboard-season/leaderboard-season.repo'
import {
  MatchAlreadyExistsException,
  NotHaveActiveLeaderboardSeasonException
} from './dto/match.error'
import { UpdateMatchBodyType } from './entities/match.entity'
import { MatchRepo } from './match.repo'

@Injectable()
export class MatchService {
  constructor(
    private matchRepo: MatchRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository,
    private readonly leaderboardSeasonRepo: LeaderboardSeasonRepo
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.matchRepo.list(pagination, langId ?? undefined)
    return {
      data,
      message: this.i18nService.translate(MatchMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const match = await this.matchRepo.findById(id)
    if (!match) {
      throw new NotFoundRecordException()
    }

    return {
      statusCode: HttpStatus.OK,
      data: match,
      message: this.i18nService.translate(MatchMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      createdById
    }: {
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdMatch: any = null

    try {
      const leaderboardActive = await this.leaderboardSeasonRepo.findActiveSeason()
      if (!leaderboardActive) {
        throw new NotHaveActiveLeaderboardSeasonException()
      }
      return await this.matchRepo.withTransaction(async (prismaTx) => {
        const result = await this.matchRepo.create(
          {
            createdById,
            data: {
              leaderboardSeasonId: leaderboardActive.id
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(MatchMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete match if created
      if (createdMatch?.id) {
        try {
          await this.matchRepo.delete(
            {
              id: createdMatch.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new MatchAlreadyExistsException()
      }
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
      updatedById
    }: {
      id: number
      data: UpdateMatchBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingMatch: any = null

    try {
      return await this.matchRepo.withTransaction(async (prismaTx) => {
        existingMatch = await this.matchRepo.findById(id)
        if (!existingMatch) {
          throw new NotFoundRecordException()
        }
        const updatedMatch = await this.matchRepo.update(
          {
            id,
            updatedById,
            data
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedMatch,
          message: this.i18nService.translate(MatchMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new MatchAlreadyExistsException()
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
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(MatchMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getTrackingMatch(matchId: number, userId: number, lang: string = 'vi') {}
}
