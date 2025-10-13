import { DailyConditionType } from '@/common/constants/daily-request.constant'
import { I18nService } from '@/i18n/i18n.service'
import { UserDailyRequestMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError,
  todayUTCFromVN
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { DailyRequestRepo } from '../daily-request/daily-request.repo'
import { LanguagesRepository } from '../languages/languages.repo'
import { TranslationRepository } from '../translation/translation.repo'
import { UserDailyRequestAlreadyExistsException } from './dto/user-daily-request.error'
import {
  CreateUserDailyRequestBodyType,
  UpdateUserDailyRequestBodyType,
  UserDailyRequestDetailType
} from './entities/user-daily-request.entity'
import { UserDailyRequestRepo } from './user-daily-request.repo'

@Injectable()
export class UserDailyRequestService {
  constructor(
    private userDailyRequestRepo: UserDailyRequestRepo,
    private readonly i18nService: I18nService,
    private readonly dailyReqRepo: DailyRequestRepo,
    private readonly langRepo: LanguagesRepository,
    private readonly translationRepo: TranslationRepository
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

  /**
   * Lấy danh sách daily request của user hôm nay
   * Nếu chưa có thì tự động tạo mới
   * Kèm theo nameTranslation và descriptionTranslation
   */
  async getUserDailyRequestsToday(userId: number, lang: string = 'vi') {
    try {
      const now = new Date()
      const today = todayUTCFromVN()
      console.log(today.toISOString())

      // Lấy languageId từ code
      const languageId = await this.langRepo.getIdByCode(lang)
      if (!languageId) {
        throw new NotFoundRecordException()
      }
      // 1. Lấy tất cả daily requests đang active
      const activeDailyRequests = await this.dailyReqRepo.list(
        {
          currentPage: 1,
          pageSize: 1000,
          qs: 'isActive=true'
        },
        languageId
      )

      // 2. Lấy user daily requests hiện có của user hôm nay
      const existingUserDailyRequests = await this.userDailyRequestRepo.findByUserAndDate(
        userId,
        today
      )
      const existingDailyRequestIds = existingUserDailyRequests.map(
        (udr) => udr.dailyRequestId
      )

      // 3. Tìm những daily requests user chưa có hôm nay và tự động tạo
      const missingDailyRequests = activeDailyRequests.results.filter(
        (dr) => !existingDailyRequestIds.includes(dr.id)
      )

      for (const dailyRequest of missingDailyRequests) {
        try {
          let progress = 0
          // Check nếu là streak type thì tính progress
          const isStreak = await this.dailyReqRepo.checkDailyRequestIsStreak(
            dailyRequest.id
          )
          if (isStreak) {
            progress = await this.checkStreakComplete(userId, dailyRequest.id)
          }

          await this.userDailyRequestRepo.create({
            createdById: userId,
            data: {
              userId,
              dailyRequestId: dailyRequest.id,
              date: today,
              progress
            }
          })
        } catch (error) {
          throw error
        }
      }

      // 4. Lấy lại tất cả user daily requests của user hôm nay (bao gồm vừa tạo)
      const allUserDailyRequests =
        await this.userDailyRequestRepo.findByUserAndDateWithDetails(userId, today)

      // 5. Lấy tất cả nameKey và descriptionKey để query translations
      const translationKeys: string[] = []
      allUserDailyRequests.forEach((udr) => {
        if (udr.dailyRequest?.nameKey) {
          translationKeys.push(udr.dailyRequest.nameKey)
        }
        if (udr.dailyRequest?.descriptionKey) {
          translationKeys.push(udr.dailyRequest.descriptionKey)
        }
      })

      // 6. Lấy tất cả translations cho các keys này với languageId
      const translations = await this.translationRepo.findByKeysAndLanguage(
        translationKeys,
        languageId
      )

      // Tạo map để truy cập nhanh
      const translationMap = new Map<string, string>()
      translations.forEach((t) => {
        translationMap.set(t.key, t.value)
      })

      // 7. Gắn translations vào kết quả
      const result: UserDailyRequestDetailType[] = allUserDailyRequests.map((udr) => ({
        ...udr,
        dailyRequest: udr.dailyRequest
          ? {
              ...udr.dailyRequest,
              nameTranslation: translationMap.get(udr.dailyRequest.nameKey) || '',
              descriptionTranslation:
                translationMap.get(udr.dailyRequest.descriptionKey) || null
            }
          : undefined
      }))

      return {
        statusCode: HttpStatus.OK,
        data: result,
        message: this.i18nService.translate(
          UserDailyRequestMessage.GET_LIST_SUCCESS,
          lang
        )
      }
    } catch (error) {
      console.error('Error in getUserDailyRequestsToday:', error)
      throw error
    }
  }

  async presentUserToday(userId: number, lang: string = 'vi') {
    try {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      console.log(today)

      // Lấy languageId từ code
      const languageId = await this.langRepo.getIdByCode(lang)
      if (!languageId) {
        throw new NotFoundRecordException()
      }

      const dailyRequests = await this.dailyReqRepo.findByWhere({
        conditionTypes: [DailyConditionType.STREAK_LOGIN, DailyConditionType.LOGIN]
      })

      // Kiểm tra user đã có user daily request nào hôm nay chưa và tạo nếu thiếu
      for (const dailyRequest of dailyRequests) {
        const existingUserDailyRequest =
          await this.userDailyRequestRepo.findByUserIdDateDailyId(
            userId,
            today,
            dailyRequest.id
          )

        if (!existingUserDailyRequest) {
          // Tạo user daily request mới
          let progress = 0

          // Check nếu là streak type thì tính progress
          if (dailyRequest.conditionType === DailyConditionType.STREAK_LOGIN) {
            progress = await this.checkStreakComplete(userId, dailyRequest.id)
          }

          await this.userDailyRequestRepo.create({
            createdById: userId,
            data: {
              userId,
              dailyRequestId: dailyRequest.id,
              date: today,
              progress
            }
          })
        } else {
          // Update existing user daily request
          if (dailyRequest.conditionType === DailyConditionType.STREAK_LOGIN) {
            await this.updateStreakProgress(existingUserDailyRequest.id, userId)
          } else {
            await this.updateNormalProgress(existingUserDailyRequest.id, userId)
          }
        }
      }

      return {
        statusCode: HttpStatus.OK,
        message: this.i18nService.translate(UserDailyRequestMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      console.error('Error in presentUserToday:', error)
      throw error
    }
  }

  /**
   * Update progress cho daily request không phải streak
   */
  private async updateNormalProgress(userDailyRequestId: number, userId: number) {
    try {
      const userDailyRequest =
        await this.userDailyRequestRepo.findById(userDailyRequestId)
      if (!userDailyRequest) {
        throw new NotFoundRecordException()
      }

      // Lấy thông tin daily request để biết conditionValue
      const dailyRequest = await this.dailyReqRepo.findById(
        userDailyRequest.dailyRequestId
      )
      if (!dailyRequest) {
        throw new NotFoundRecordException()
      }

      // Tăng progress lên 1
      const newProgress = userDailyRequest.progress + 1

      // Check xem đã hoàn thành chưa
      const isCompleted = newProgress >= dailyRequest.conditionValue
      const completedAt = isCompleted ? new Date() : null

      await this.userDailyRequestRepo.update({
        id: userDailyRequestId,
        updatedById: userId,
        data: {
          progress: newProgress,
          isCompleted,
          completedAt
        }
      })
    } catch (error) {
      console.error('Error updating normal progress:', error)
      throw error
    }
  }

  /**
   * Update progress cho daily request streak
   */
  private async updateStreakProgress(userDailyRequestId: number, userId: number) {
    try {
      const userDailyRequest =
        await this.userDailyRequestRepo.findById(userDailyRequestId)
      if (!userDailyRequest) {
        throw new NotFoundRecordException()
      }

      // Lấy thông tin daily request để biết conditionValue
      const dailyRequest = await this.dailyReqRepo.findById(
        userDailyRequest.dailyRequestId
      )
      if (!dailyRequest) {
        throw new NotFoundRecordException()
      }

      // Đối với streak, progress được tính từ streak liên tiếp
      const streakProgress = await this.checkStreakComplete(userId, dailyRequest.id)

      // Check xem đã hoàn thành chưa
      const isCompleted = streakProgress >= dailyRequest.conditionValue
      const completedAt = isCompleted ? new Date() : null

      await this.userDailyRequestRepo.update({
        id: userDailyRequestId,
        updatedById: userId,
        data: {
          progress: streakProgress,
          isCompleted,
          completedAt
        }
      })
    } catch (error) {
      console.error('Error updating streak progress:', error)
      throw error
    }
  }
}
