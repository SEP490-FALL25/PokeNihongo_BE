import { I18nService } from '@/i18n/i18n.service'
import { MatchRoundMessage } from '@/i18n/message-keys'
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
import { MatchRepo } from '../match/match.repo'
import { MatchRoundAlreadyExistsException } from './dto/match-round.error'
import {
  CreateMatchRoundBodyType,
  UpdateMatchRoundBodyType
} from './entities/match-round.entity'
import { MatchRoundRepo } from './match-round.repo'

@Injectable()
export class MatchRoundService {
  constructor(
    private matchRoundRepo: MatchRoundRepo,
    private matchRepo: MatchRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository,
    private readonly leaderboardSeasonRepo: LeaderboardSeasonRepo
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.matchRoundRepo.list(pagination, langId ?? undefined)
    return {
      data,
      message: this.i18nService.translate(MatchRoundMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const matchRound = await this.matchRoundRepo.findById(id)
    if (!matchRound) {
      throw new NotFoundRecordException()
    }

    return {
      statusCode: HttpStatus.OK,
      data: matchRound,
      message: this.i18nService.translate(MatchRoundMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      createdById,
      data
    }: {
      createdById: number
      data: CreateMatchRoundBodyType
    },
    lang: string = 'vi'
  ) {
    let createdMatchRound: any = null

    try {
      //check coi match co ton tai khong
      const matchExist = await this.matchRepo.findById(data.matchId)
      if (!matchExist) {
        throw new NotFoundRecordException()
      }

      return await this.matchRoundRepo.withTransaction(async (prismaTx) => {
        const result = await this.matchRoundRepo.create(
          {
            createdById,
            data
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(MatchRoundMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete matchRound if created
      if (createdMatchRound?.id) {
        try {
          await this.matchRoundRepo.delete(
            {
              id: createdMatchRound.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new MatchRoundAlreadyExistsException()
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
      data: UpdateMatchRoundBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingMatchRound: any = null

    try {
      return await this.matchRoundRepo.withTransaction(async (prismaTx) => {
        existingMatchRound = await this.matchRoundRepo.findById(id)
        if (!existingMatchRound) {
          throw new NotFoundRecordException()
        }
        const updatedMatchRound = await this.matchRoundRepo.update(
          {
            id,
            updatedById,
            data
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedMatchRound,
          message: this.i18nService.translate(MatchRoundMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new MatchRoundAlreadyExistsException()
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
        message: this.i18nService.translate(MatchRoundMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
