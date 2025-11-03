import { I18nService } from '@/i18n/i18n.service'
import { MatchQueueMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { Injectable } from '@nestjs/common'
import { QueueStatus } from '@prisma/client'
import { UserPokemonRepo } from '../user-pokemon/user-pokemon.repo'
import { UserNotFoundException } from '../user/dto/user.error'
import {
  MatchQueueAlreadyExistsException,
  UserNotEnoughConditionException
} from './dto/match-queue.error'
import { MatchQueueRepo } from './match-queue.repo'

@Injectable()
export class MatchQueueService {
  constructor(
    private matchQueueRepo: MatchQueueRepo,
    private readonly i18nService: I18nService,
    private readonly sharedUserRepo: SharedUserRepository,
    private readonly userPokeRepo: UserPokemonRepo
  ) {}

  async create(
    {
      createdById
    }: {
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const user = await this.sharedUserRepo.findUniqueWithLevel({
        id: createdById
      })
      if (!user) {
        throw new UserNotFoundException()
      }
      // user du level 5 chua ?, du 6 pokemon chua?
      const userPokemons = await this.userPokeRepo.countPokemonByUser(createdById)

      if ((user.level?.levelNumber || 0) < 5 || userPokemons < 6) {
        throw new UserNotEnoughConditionException()
      }

      // Tạo matchQueue trước
      const result = await this.matchQueueRepo.create({
        createdById,
        data: {
          userId: createdById,
          userElo: user?.eloscore || 0,
          status: QueueStatus.WAITING
        }
      })
      // tạo xong, có đứa vào hàng đợi, để cập nhật lại danh sách chờ

      return {
        data: result,
        message: this.i18nService.translate(MatchQueueMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new MatchQueueAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ deletedById }: { deletedById: number }, lang: string = 'vi') {
    try {
      await this.matchQueueRepo.delete({
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(MatchQueueMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
