import { I18nService } from '@/i18n/i18n.service'
import { MatchRoundParticipantMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { MatchRoundParticipantNotFoundException } from './dto/match-round-participant.error'
import {
  CreateMatchRoundParticipantBodyType,
  UpdateMatchRoundParticipantBodyType
} from './entities/match-round-participant.entity'
import { MatchRoundParticipantRepo } from './match-round-participant.repo'

@Injectable()
export class MatchRoundParticipantService {
  constructor(
    private matchRoundParticipantRepo: MatchRoundParticipantRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.matchRoundParticipantRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const matchRoundParticipant = await this.matchRoundParticipantRepo.findById(id)
    if (!matchRoundParticipant) {
      throw new MatchRoundParticipantNotFoundException()
    }

    return {
      statusCode: 200,
      data: matchRoundParticipant,
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateMatchRoundParticipantBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.matchRoundParticipantRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(
          MatchRoundParticipantMessage.CREATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
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
      userId
    }: {
      id: number
      data: UpdateMatchRoundParticipantBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      //check coi thang user nay co pity nao dang pending ko, co thi ko dc tao them
      const existingPity = await this.matchRoundParticipantRepo.findById(id)
      if (!existingPity) {
        throw new MatchRoundParticipantNotFoundException()
      }

      const matchRoundParticipant = await this.matchRoundParticipantRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: matchRoundParticipant,
        message: this.i18nService.translate(
          MatchRoundParticipantMessage.UPDATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchRoundParticipantNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existMatchRoundParticipant = await this.matchRoundParticipantRepo.findById(id)
      if (!existMatchRoundParticipant) {
        throw new MatchRoundParticipantNotFoundException()
      }

      await this.matchRoundParticipantRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(
          MatchRoundParticipantMessage.DELETE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchRoundParticipantNotFoundException()
      }
      throw error
    }
  }
}
