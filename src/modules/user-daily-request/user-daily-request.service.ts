import { I18nService } from '@/i18n/i18n.service'
import { UserDailyRequestMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { DailyRequestRepo } from '../daily-request/daily-request.repo'
import { LanguagesRepository } from '../languages/languages.repo'
import { UserDailyRequestAlreadyExistsException } from './dto/user-daily-request.error'
import {
  CreateUserDailyRequestBodyType,
  UpdateUserDailyRequestBodyType
} from './entities/user-daily-request.entity'
import { UserDailyRequestRepo } from './user-daily-request.repo'

@Injectable()
export class UserDailyRequestService {
  constructor(
    private userDailyRequestRepo: UserDailyRequestRepo,
    private readonly i18nService: I18nService,
    private readonly dailyReqRepo: DailyRequestRepo,
    private readonly langRepo: LanguagesRepository
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.userDailyRequestRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(UserDailyRequestMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const userDailyRequest = await this.userDailyRequestRepo.findById(id)
    if (!userDailyRequest) {
      throw new NotFoundRecordException()
    }
    return {
      statusCode: HttpStatus.OK,
      data: userDailyRequest,
      message: this.i18nService.translate(UserDailyRequestMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateUserDailyRequestBodyType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      let progress = 0
      //check xem dailyRequestId nay type la streak ha ? Neu la trick thi cap nhap progress
      const isDailyStreack = await this.dailyReqRepo.checkDailyRequestIsStreak(
        data.dailyRequestId
      )
      if (isDailyStreack) {
        progress = await this.checkStreakComplete(data.userId, data.dailyRequestId)
      }

      const date = new Date()
      date.setUTCHours(0, 0, 0, 0)

      const result = await this.userDailyRequestRepo.create({
        createdById,
        data: {
          ...data,
          date,
          progress
        }
      })
      return {
        statusCode: HttpStatus.CREATED,
        data: result,
        message: this.i18nService.translate(UserDailyRequestMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new UserDailyRequestAlreadyExistsException()
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
      data: UpdateUserDailyRequestBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      // check xem progress = daily.conditionValue ko
      const isUserdailyReq = await this.userDailyRequestRepo.findById(id)
      if (!isUserdailyReq) {
        throw new NotFoundRecordException()
      }
      const dailyConditionValue = await this.dailyReqRepo.findById(
        isUserdailyReq.dailyRequestId
      )

      if (data.progress && data.progress === dailyConditionValue?.conditionValue) {
        data.isCompleted = true
      }
      const userDailyRequest = await this.userDailyRequestRepo.update({
        id,
        updatedById,
        data
      })
      return {
        data: userDailyRequest,
        message: this.i18nService.translate(UserDailyRequestMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new UserDailyRequestAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.userDailyRequestRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(UserDailyRequestMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async checkStreakComplete(userId: number, dailyRequestId: number) {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    date.setDate(date.getDate() - 1) // Hom truoc
    const userDailyRequest = await this.userDailyRequestRepo.findByUserIdDateDailyId(
      userId,
      date,
      dailyRequestId
    )
    if (userDailyRequest) {
      return userDailyRequest.progress + 1
    }
    return 0
  }

  async getWithUserToday(userId: number, lang: string = 'vi') {
    const date = new Date()
    date.setUTCHours(0, 0, 0, 0)

    const langId = await this.langRepo.getIdByCode(lang)
  }
}
