import { I18nService } from '@/i18n/i18n.service'
import { AchievementGroupMessage } from '@/i18n/message-keys'
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
import { AchievementGroupRepo } from './achievement-group.repo'
import { AchievementGroupAlreadyExistsException } from './dto/achievement-group.error'
import {
  CreateAchievementGroupBodyInputType,
  CreateAchievementGroupBodyType,
  UpdateAchievementGroupBodyInputType,
  UpdateAchievementGroupBodyType
} from './entities/achievement-group.entity'

@Injectable()
export class AchievementGroupService {
  constructor(
    private achievementGroupRepo: AchievementGroupRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository,
    private readonly translationRepo: TranslationRepository
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.achievementGroupRepo.list(pagination)
    return {
      data,
      message: this.i18nService.translate(AchievementGroupMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const achievementGroup = await this.achievementGroupRepo.findById(id)
    if (!achievementGroup) {
      throw new NotFoundRecordException()
    }
    return {
      data: achievementGroup,
      message: this.i18nService.translate(AchievementGroupMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateAchievementGroupBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      // tạo trước để lấy id rồi update lại nameKey và descriptionKey
      const initData: CreateAchievementGroupBodyType = {
        nameKey: `achievement_group.name.${Date.now()}`,
        descriptionKey: `achievement_group.description.${Date.now()}`,
        displayOrder: data.displayOrder
      }

      const achievementGroupResult = await this.achievementGroupRepo.create({
        createdById,
        data: initData
      })

      //final key để add cho translation và update lại bảng achievementGroup
      const nameKey = `achievement_group.name.${achievementGroupResult.id}`
      const descriptionKey = `achievement_group.description.${achievementGroupResult.id}`

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
          key: nameKey,
          value: item.value
        })
      }

      // descriptionTranslations → key = descriptionKey
      for (const item of data.descriptionTranslations ?? []) {
        translationRecords.push({
          languageId: langMap[item.key],
          key: descriptionKey,
          value: item.value
        })
      }

      // Thêm bản dịch và update lại achievementGroup
      const [, result] = await Promise.all([
        this.translationRepo.createMany(translationRecords),
        await this.achievementGroupRepo.update({
          id: achievementGroupResult.id,
          data: {
            nameKey,
            descriptionKey
          }
        })
      ])

      return {
        data: result,
        message: this.i18nService.translate(AchievementGroupMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new AchievementGroupAlreadyExistsException()
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
      data: UpdateAchievementGroupBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    try {
      const initData: UpdateAchievementGroupBodyType = {
        displayOrder: data.displayOrder
      }

      const achievementGroup = await this.achievementGroupRepo.update({
        id,
        updatedById,
        data
      })
      return {
        data: achievementGroup,
        message: this.i18nService.translate(AchievementGroupMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new AchievementGroupAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.achievementGroupRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(AchievementGroupMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
