import { I18nService } from '@/i18n/i18n.service'
import { NotificationMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { LanguagesRepository } from '../languages/languages.repo'
import { NotificationNotFoundException } from './dto/notification.error'
import {
  CreateNotificationBodyType,
  UpdateNotificationBodyType
} from './entities/notification.entity'
import { NotificationRepo } from './notification.repo'

@Injectable()
export class NotificationService {
  constructor(
    private notificationRepo: NotificationRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository
  ) {}

  private async convertTranslationsToLangCodes(
    translations: Array<{ languageId: number; value: string }>
  ): Promise<Array<{ key: string; value: string }>> {
    if (!translations || translations.length === 0) return []

    const allLangIds = Array.from(new Set(translations.map((t) => t.languageId)))
    const langs = await this.languageRepo.getWithListId(allLangIds)
    const idToCode = new Map(langs.map((l) => [l.id, l.code]))

    return translations.map((t) => ({
      key: idToCode.get(t.languageId) || String(t.languageId),
      value: t.value
    }))
  }

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.notificationRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(NotificationMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const notification = await this.notificationRepo.findById(id)
    if (!notification) {
      throw new NotificationNotFoundException()
    }

    return {
      statusCode: 200,
      data: notification,
      message: this.i18nService.translate(NotificationMessage.GET_LIST_SUCCESS, lang)
    }
  }
  async create(
    { userId, data }: { userId: number; data: CreateNotificationBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.notificationRepo.create({
        createdById: userId,
        data: {
          ...data,
          userId
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(NotificationMessage.CREATE_SUCCESS, lang)
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
      data: UpdateNotificationBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const notification = await this.notificationRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: notification,
        message: this.i18nService.translate(NotificationMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotificationNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existNotification = await this.notificationRepo.findById(id)
      if (!existNotification) {
        throw new NotificationNotFoundException()
      }

      await this.notificationRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(NotificationMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotificationNotFoundException()
      }
      throw error
    }
  }

  async getUserSubWithSubPlan(
    pagination: PaginationQueryType,
    userId: number,
    lang: string = 'vi'
  ) {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.notificationRepo.getUserSubWithSubPlan(
      pagination,
      userId,
      langId ?? undefined
    )
    // lượt bỏ nameTranslations, descriptionTranslations
    const results = data.results.map((us: any) => {
      const title = this.i18nService.translate(us.titleKey, lang)
      const body = this.i18nService.translate(us.bodyKey, lang)

      return {
        ...us,
        title: title,
        body: body
      }
    })
    return {
      statusCode: 200,
      data: {
        ...data,
        results
      },
      message: this.i18nService.translate(NotificationMessage.GET_LIST_SUCCESS, lang)
    }
  }
}
