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
    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId) {
      throw new NotFoundRecordException()
    }

    const data = await this.achievementGroupRepo.list(pagination, langId)

    // Lấy translation cho từng achievement group
    const translationKeys = data.results.flatMap((item) => [
      item.nameKey,
      item.descriptionKey
    ])

    const translations = await this.translationRepo.findByKeysAndLanguage(
      translationKeys,
      langId
    )
    const translationMap = new Map(translations.map((t) => [t.key, t.value]))

    // Gắn translation vào từng item
    const resultsWithTranslation = data.results.map((item) => ({
      ...item,
      nameTranslation: translationMap.get(item.nameKey) || item.nameKey,
      descriptionTranslation:
        translationMap.get(item.descriptionKey) || item.descriptionKey
    }))

    return {
      data: {
        ...data,
        results: resultsWithTranslation
      },
      message: this.i18nService.translate(AchievementGroupMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const [achievementGroup, langId] = await Promise.all([
      this.achievementGroupRepo.findById(id),
      this.languageRepo.getIdByCode(lang)
    ])

    if (!langId) {
      throw new NotFoundRecordException()
    }
    if (!achievementGroup) {
      throw new NotFoundRecordException()
    }

    // Lấy translation
    const translations = await this.translationRepo.findByKeysAndLanguage(
      [achievementGroup.nameKey, achievementGroup.descriptionKey],
      langId
    )
    const translationMap = new Map(translations.map((t) => [t.key, t.value]))

    const dataWithTranslation = {
      ...achievementGroup,
      nameTranslation:
        translationMap.get(achievementGroup.nameKey) || achievementGroup.nameKey,
      descriptionTranslation:
        translationMap.get(achievementGroup.descriptionKey) ||
        achievementGroup.descriptionKey
    }

    return {
      data: dataWithTranslation,
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
      return await this.achievementGroupRepo.withTransaction(async (prismaTx) => {
        // tạo trước để lấy id rồi update lại nameKey và descriptionKey
        const initData: CreateAchievementGroupBodyType = {
          nameKey: `achievement_group.name.${Date.now()}`,
          descriptionKey: `achievement_group.description.${Date.now()}`,
          displayOrder: data.displayOrder
        }

        const achievementGroupResult = await this.achievementGroupRepo.create(
          {
            createdById,
            data: initData
          },
          prismaTx
        )

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

        //check khong cho trung name
        await this.translationRepo.validateTranslationRecords(translationRecords)

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
          message: this.i18nService.translate(
            AchievementGroupMessage.CREATE_SUCCESS,
            lang
          )
        }
      })
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
    let existingAchievementGroup: any = null

    try {
      return await this.achievementGroupRepo.withTransaction(async (prismaTx) => {
        // --- 1. Lấy bản ghi hiện tại ---
        existingAchievementGroup = await this.achievementGroupRepo.findById(id)
        if (!existingAchievementGroup) throw new NotFoundRecordException()

        // --- 2. Chuẩn bị data update ---
        const dataUpdate: UpdateAchievementGroupBodyType = {
          displayOrder: data.displayOrder
        }

        // --- 3. Handle translations nếu có ---
        if (data.nameTranslations || data.descriptionTranslations) {
          const nameList = data.nameTranslations?.map((t) => t.key) ?? []
          const descList = data.descriptionTranslations?.map((t) => t.key) ?? []

          const allLangCodes = Array.from(new Set([...nameList, ...descList]))

          if (allLangCodes.length > 0) {
            // Lấy languages tương ứng
            const languages = await this.languageRepo.getWithListCode(allLangCodes)
            const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

            // Kiểm tra missing language
            const missingLangs = allLangCodes.filter((code) => !langMap[code])
            if (missingLangs.length > 0) throw new LanguageNotExistToTranslateException()

            // --- 4. Tạo translation records ---
            const translationRecords: CreateTranslationBodyType[] = []

            // nameTranslations
            for (const t of data.nameTranslations ?? []) {
              translationRecords.push({
                languageId: langMap[t.key],
                key: existingAchievementGroup.nameKey,
                value: t.value
              })
            }

            // --- 5. Validate translation records: check name la dc, desc cho trung---
            await this.translationRepo.validateTranslationRecords(translationRecords)

            // descriptionTranslations
            for (const t of data.descriptionTranslations ?? []) {
              translationRecords.push({
                languageId: langMap[t.key],
                key: existingAchievementGroup.descriptionKey,
                value: t.value
              })
            }

            // --- 6. Update translations với transaction ---
            const translationPromises = translationRecords.map((record) =>
              this.translationRepo.createOrUpdateWithTransaction(record, prismaTx)
            )
            await Promise.all(translationPromises)
          }
        }

        // --- 7. Update AchievementGroup chính ---
        const updatedAchievementGroup = await this.achievementGroupRepo.update({
          id,
          updatedById,
          data: dataUpdate
        })

        return {
          data: updatedAchievementGroup,
          message: this.i18nService.translate(
            AchievementGroupMessage.UPDATE_SUCCESS,
            lang
          )
        }
      })
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
