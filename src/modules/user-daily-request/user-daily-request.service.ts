import { DailyConditionType } from '@/common/constants/daily-request.constant'
import { I18nService } from '@/i18n/i18n.service'
import { UserDailyRequestMessage } from '@/i18n/message-keys'
import { UserService } from '@/modules/user/user.service'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError,
  todayUTCFromVN
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { RewardTarget, RewardType } from '@prisma/client'
import { DailyRequestRepo } from '../daily-request/daily-request.repo'
import { LanguagesRepository } from '../languages/languages.repo'
import { TranslationRepository } from '../translation/translation.repo'
import {
  UserAlreadyAttendedTodayException,
  UserDailyRequestAlreadyExistsException
} from './dto/user-daily-request.error'
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
    private readonly translationRepo: TranslationRepository,
    private readonly userService: UserService
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

      const date = todayUTCFromVN()

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
    const yesterday = todayUTCFromVN()
    yesterday.setDate(yesterday.getDate() - 1) // Hôm trước

    const userDailyRequest = await this.userDailyRequestRepo.findByUserIdDateDailyId(
      userId,
      yesterday,
      dailyRequestId
    )
    if (userDailyRequest && userDailyRequest.isCompleted) {
      return userDailyRequest.progress + 1
    }
    // Nếu không có record hôm trước hoặc chưa hoàn thành, streak bắt đầu từ 1
    return 1
  }

  /**
   * Lấy danh sách daily request của user hôm nay
   * Nếu chưa có thì tự động tạo mới
   * Kèm theo nameTranslation và descriptionTranslation
   */
  async getUserDailyRequestsToday(userId: number, lang: string = 'vi') {
    try {
      const today = todayUTCFromVN()
      const bDate = todayUTCFromVN()
      bDate.setDate(bDate.getDate() - 1)

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
      const today = todayUTCFromVN()

      // Lấy languageId từ code
      const languageId = await this.langRepo.getIdByCode(lang)
      if (!languageId) {
        throw new NotFoundRecordException()
      }

      // Lấy các daily request LOGIN để kiểm tra điểm danh
      const loginDailyRequests = await this.dailyReqRepo.findByWhere({
        conditionTypes: [DailyConditionType.LOGIN]
      })

      // Kiểm tra xem user đã điểm danh hôm nay chưa
      let hasAttended = false
      for (const dailyRequest of loginDailyRequests) {
        const existingUserDailyRequest =
          await this.userDailyRequestRepo.findByUserIdDateDailyId(
            userId,
            today,
            dailyRequest.id
          )

        if (existingUserDailyRequest && existingUserDailyRequest.isCompleted) {
          hasAttended = true
          break
        }
      }

      // Nếu đã điểm danh hôm nay, throw error
      if (hasAttended) {
        throw new UserAlreadyAttendedTodayException()
      }

      // Lấy tất cả daily requests login và streak login
      const dailyRequests = await this.dailyReqRepo.findByWhere({
        conditionTypes: [DailyConditionType.STREAK_LOGIN, DailyConditionType.LOGIN]
      })

      const rewardsToGive: Array<{
        id: number
        rewardType: RewardType
        rewardTarget: RewardTarget
        rewardItem: number
      }> = []

      // Xử lý điểm danh cho từng daily request
      for (const dailyRequest of dailyRequests) {
        const existingUserDailyRequest =
          await this.userDailyRequestRepo.findByUserIdDateDailyId(
            userId,
            today,
            dailyRequest.id
          )

        if (!existingUserDailyRequest) {
          // Tạo user daily request mới
          let progress = 1 // Điểm danh = 1 progress

          // Check nếu là streak type thì tính progress từ streak
          if (dailyRequest.conditionType === DailyConditionType.STREAK_LOGIN) {
            progress = await this.checkStreakComplete(userId, dailyRequest.id)
          }

          // Check xem đã hoàn thành daily request chưa
          const isCompleted = progress >= dailyRequest.conditionValue
          const completedAt = isCompleted ? new Date() : null

          await this.userDailyRequestRepo.create({
            createdById: userId,
            data: {
              userId,
              dailyRequestId: dailyRequest.id,
              date: today,
              progress,
              isCompleted,
              completedAt
            }
          })

          // Nếu hoàn thành và có reward, thu thập reward để trao
          if (isCompleted && (dailyRequest as any).reward) {
            rewardsToGive.push({
              id: (dailyRequest as any).reward.id,
              rewardType: (dailyRequest as any).reward.rewardType,
              rewardTarget: (dailyRequest as any).reward.rewardTarget,
              rewardItem: (dailyRequest as any).reward.rewardItem
            })
          }
        } else {
          // Update existing user daily request (chỉ nếu chưa hoàn thành)
          if (!existingUserDailyRequest.isCompleted) {
            let newProgress = existingUserDailyRequest.progress

            if (dailyRequest.conditionType === DailyConditionType.STREAK_LOGIN) {
              newProgress = await this.checkStreakComplete(userId, dailyRequest.id)
            } else {
              newProgress = existingUserDailyRequest.progress + 1
            }

            // Check xem đã hoàn thành chưa
            const isCompleted = newProgress >= dailyRequest.conditionValue
            const completedAt = isCompleted ? new Date() : null

            await this.userDailyRequestRepo.update({
              id: existingUserDailyRequest.id,
              updatedById: userId,
              data: {
                progress: newProgress,
                isCompleted,
                completedAt
              }
            })

            // Nếu vừa hoàn thành và có reward, thu thập reward để trao
            if (isCompleted && (dailyRequest as any).reward) {
              rewardsToGive.push({
                id: (dailyRequest as any).reward.id,
                rewardType: (dailyRequest as any).reward.rewardType,
                rewardTarget: (dailyRequest as any).reward.rewardTarget,
                rewardItem: (dailyRequest as any).reward.rewardItem
              })
            }
          }
        }
      }

      // Trao rewards cho user
      for (const reward of rewardsToGive) {
        if (reward.rewardTarget === RewardTarget.EXP) {
          // Cộng EXP cho user
          await this.userService.userAddExp(userId, reward.rewardItem, lang)
        } else if (reward.rewardTarget === RewardTarget.POINT) {
          // Cộng freeCoins cho user
          await this.userService.addFreeCoins(userId, reward.rewardItem, lang)
        }
      }

      return {
        statusCode: HttpStatus.OK,
        data: { rewardsReceived: rewardsToGive },
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
