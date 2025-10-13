import { I18nService } from '@/i18n/i18n.service'
import { DailyRequestMessage } from '@/i18n/message-keys'
import {
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { LanguagesRepository } from '../languages/languages.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entities'
import { TranslationRepository } from '../translation/translation.repo'
import { DailyRequestRepo } from './daily-request.repo'
import { DailyRequestAlreadyExistsException } from './dto/daily-request.error'
import {
  CreateDailyRequestBodyInputType,
  CreateDailyRequestBodyType,
  UpdateDailyRequestBodyInputType,
  UpdateDailyRequestBodyType
} from './entities/daily-request.entity'

@Injectable()
export class DailyRequestService {
  constructor(
    private dailyRequestRepo: DailyRequestRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository,
    private readonly translationRepo: TranslationRepository
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.dailyRequestRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(DailyRequestMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const dailyRequest = await this.dailyRequestRepo.findById(id)
    if (!dailyRequest) {
      throw new NotFoundRecordException()
    }
    return {
      data: dailyRequest,
      message: this.i18nService.translate(DailyRequestMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateDailyRequestBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const nameKey = `daily_request.name.${Date.now()}`
      const descKey = `daily_request.description.${Date.now()}`

      //convert data cho create
      const dataCreate: CreateDailyRequestBodyType = {
        conditionType: data.conditionType,
        conditionValue: data.conditionValue,
        nameKey,
        descriptionKey: descKey,
        rewardId: data.rewardId,
        isActive: data.isActive
      }

      const createdDailyRequest = await this.dailyRequestRepo.create({
        createdById,
        data: dataCreate
      })

      // co id, tao nameKey chuan

      const fNameKey = `daily_request.name.${createdDailyRequest.id}`
      const fDescKey = `daily_request.description.${createdDailyRequest.id}`

      const nameList = data.nameTranslations.map((t) => t.key)
      const desList = data.descriptionTranslations?.map((t) => t.key) ?? []

      // Gộp & loại bỏ trùng key
      const allLangCodes = Array.from(new Set([...nameList, ...desList]))

      // Lấy danh sách ngôn ngữ tương ứng với các key
      const languages = await this.languageRepo.getWithListCode(allLangCodes)

      // Tạo map { code: id } để truy cập nhanh
      const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

      // Kiểm tra có ngôn ngữ nào bị thiếu không
      const missingLangs = allLangCodes.filter((code) => !langMap[code])
      if (missingLangs.length > 0) {
        throw new LanguageNotExistToTranslateException()
      }

      // Tạo danh sách bản dịch
      const translationRecords: CreateTranslationBodyType[] = []

      // nameTranslations → key = nameKey
      for (const item of data.nameTranslations) {
        translationRecords.push({
          languageId: langMap[item.key],
          key: fNameKey,
          value: item.value
        })
      }

      // descriptionTranslations → key = descriptionKey
      for (const item of data.descriptionTranslations ?? []) {
        translationRecords.push({
          languageId: langMap[item.key],
          key: fDescKey,
          value: item.value
        })
      }

      // Thêm bản dịch và update lại achievementGroup
      const [, result] = await Promise.all([
        this.translationRepo.createMany(translationRecords),
        await this.dailyRequestRepo.update({
          id: createdDailyRequest.id,
          data: {
            nameKey: fNameKey,
            descriptionKey: fDescKey
          }
        })
      ])

      return {
        data: createdDailyRequest,
        message: this.i18nService.translate(DailyRequestMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new DailyRequestAlreadyExistsException()
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
      data: UpdateDailyRequestBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      //convert data cho update
      const dataUpdate: UpdateDailyRequestBodyType = {
        ...data
      }

      const dailyRequest = await this.dailyRequestRepo.update({
        id,
        updatedById,
        data: dataUpdate
      })
      return {
        data: dailyRequest,
        message: this.i18nService.translate(DailyRequestMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new DailyRequestAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.dailyRequestRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(DailyRequestMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
