import { I18nService } from '@/i18n/i18n.service'
import { MatchParticipantMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { MatchParticipantNotFoundException } from './dto/match-participant.error'
import {
  CreateMatchParticipantBodyType,
  UpdateMatchParticipantBodyType
} from './entities/match-participant.entity'
import { MatchParticipantRepo } from './match-participant.repo'

@Injectable()
export class MatchParticipantService {
  constructor(
    private matchParticipantRepo: MatchParticipantRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.matchParticipantRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(MatchParticipantMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const matchParticipant = await this.matchParticipantRepo.findById(id)
    if (!matchParticipant) {
      throw new MatchParticipantNotFoundException()
    }

    return {
      statusCode: 200,
      data: matchParticipant,
      message: this.i18nService.translate(MatchParticipantMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateMatchParticipantBodyType },
    lang: string = 'vi'
  ) {
    try {
      // check coi co truyen userId ko, neu ko thi lay cua created_by
      data.userId = data.userId || userId

      const result = await this.matchParticipantRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(MatchParticipantMessage.CREATE_SUCCESS, lang)
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
      data: UpdateMatchParticipantBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      //check coi thang user nay co pity nao dang pending ko, co thi ko dc tao them
      const existingPity = await this.matchParticipantRepo.findById(id)
      if (!existingPity) {
        throw new MatchParticipantNotFoundException()
      }

      const matchParticipant = await this.matchParticipantRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: matchParticipant,
        message: this.i18nService.translate(MatchParticipantMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchParticipantNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existMatchParticipant = await this.matchParticipantRepo.findById(id)
      if (!existMatchParticipant) {
        throw new MatchParticipantNotFoundException()
      }

      await this.matchParticipantRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(MatchParticipantMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchParticipantNotFoundException()
      }
      throw error
    }
  }
}
