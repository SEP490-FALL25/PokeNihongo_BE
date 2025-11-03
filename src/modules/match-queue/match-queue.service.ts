import { I18nService } from '@/i18n/i18n.service'
import { MatchQueueMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { Injectable } from '@nestjs/common'
import { QueueStatus } from '@prisma/client'
import { MatchQueueAlreadyExistsException } from './dto/match-queue.error'
import { MatchQueueRepo } from './match-queue.repo'

@Injectable()
export class MatchQueueService {
  constructor(
    private matchQueueRepo: MatchQueueRepo,
    private readonly i18nService: I18nService,
    private readonly sharedUserRepo: SharedUserRepository
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
      const user = await this.sharedUserRepo.findUnique({
        id: createdById
      })
      // Tạo matchQueue trước
      const result = await this.matchQueueRepo.create({
        createdById,
        data: {
          userId: createdById,
          userElo: user?.eloscore || 0,
          status: QueueStatus.WAITING
        }
      })

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
