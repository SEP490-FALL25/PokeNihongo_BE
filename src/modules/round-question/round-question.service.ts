import { I18nService } from '@/i18n/i18n.service'
import { RoundQuestionMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { RoundQuestionNotFoundException } from './dto/round-question.error'
import {
  CreateRoundQuestionBodyType,
  UpdateRoundQuestionBodyType
} from './entities/round-question.entity'
import { RoundQuestionRepo } from './round-question.repo'

@Injectable()
export class RoundQuestionService {
  constructor(
    private roundQuestionRepo: RoundQuestionRepo,

    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.roundQuestionRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(RoundQuestionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const roundQuestion = await this.roundQuestionRepo.findById(id)
    if (!roundQuestion) {
      throw new RoundQuestionNotFoundException()
    }

    return {
      statusCode: 200,
      data: roundQuestion,
      message: this.i18nService.translate(RoundQuestionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateRoundQuestionBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.roundQuestionRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(RoundQuestionMessage.CREATE_SUCCESS, lang)
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
      data: UpdateRoundQuestionBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const roundQuestion = await this.roundQuestionRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: roundQuestion,
        message: this.i18nService.translate(RoundQuestionMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new RoundQuestionNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existRoundQuestion = await this.roundQuestionRepo.findById(id)
      if (!existRoundQuestion) {
        throw new RoundQuestionNotFoundException()
      }

      await this.roundQuestionRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(RoundQuestionMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new RoundQuestionNotFoundException()
      }
      throw error
    }
  }
}
