import { I18nService } from '@/i18n/i18n.service'
import { AchievementMessage } from '@/i18n/message-keys'
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
import { AchievementRepo } from './achievement.repo'
import { AchievementAlreadyExistsException } from './dto/achievement.error'
import {
  CreateAchievementBodyInputType,
  CreateAchievementBodyType,
  UpdateAchievementBodyInputType,
  UpdateAchievementBodyType
} from './entities/achievement.entity'

@Injectable()
export class AchievementService {
  constructor(
    private AchievementRepo: AchievementRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository,
    private readonly translationRepo: TranslationRepository
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId) {
      throw new NotFoundRecordException()
    }

    const data = await this.AchievementRepo.list(pagination, langId)

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
      message: this.i18nService.translate(AchievementMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const [Achievement, langId] = await Promise.all([
      this.AchievementRepo.findById(id),
      this.languageRepo.getIdByCode(lang)
    ])

    if (!langId) {
      throw new NotFoundRecordException()
    }
    if (!Achievement) {
      throw new NotFoundRecordException()
    }

    // Lấy translation
    const translations = await this.translationRepo.findByKeysAndLanguage(
      [Achievement.nameKey, Achievement.descriptionKey],
      langId
    )
    const translationMap = new Map(translations.map((t) => [t.key, t.value]))

    const dataWithTranslation = {
      ...Achievement,
      nameTranslation: translationMap.get(Achievement.nameKey) || Achievement.nameKey,
      descriptionTranslation:
        translationMap.get(Achievement.descriptionKey) || Achievement.descriptionKey
    }

    return {
      data: dataWithTranslation,
      message: this.i18nService.translate(AchievementMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateAchievementBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    try {
      return await this.AchievementRepo.withTransaction(async (prismaTx) => {
        // tạo trước để lấy id rồi update lại nameKey và descriptionKey
        const initData: CreateAchievementBodyType = {
          nameKey: `achievement.name.${Date.now()}`,
          descriptionKey: `achievement.description.${Date.now()}`,
          imageUrl: data.imageUrl,
          achievementTierType: data.achievementTierType,
          conditionType: data.conditionType,
          conditionValue: data.conditionValue,
          conditionElementId: data.conditionElementId || null,
          rewardId: data.rewardId,
          groupId: data.groupId
        }

        const AchievementResult = await this.AchievementRepo.create(
          {
            createdById,
            data: initData
          },
          prismaTx
        )

        //final key để add cho translation và update lại bảng Achievement
        const nameKey = `achievement.name.${AchievementResult.id}`
        const descriptionKey = `achievement.description.${AchievementResult.id}`

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

        // Thêm bản dịch và update lại Achievement
        const [, result] = await Promise.all([
          this.translationRepo.createMany(translationRecords),
          await this.AchievementRepo.update({
            id: AchievementResult.id,
            data: {
              nameKey,
              descriptionKey
            }
          })
        ])

        return {
          data: result,
          message: this.i18nService.translate(AchievementMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new AchievementAlreadyExistsException()
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
      data: UpdateAchievementBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingAchievement: any = null

    try {
      return await this.AchievementRepo.withTransaction(async (prismaTx) => {
        // --- 1. Lấy bản ghi hiện tại ---
        existingAchievement = await this.AchievementRepo.findById(id)
        if (!existingAchievement) throw new NotFoundRecordException()

        // --- 2. Chuẩn bị data update ---
        const dataUpdate: UpdateAchievementBodyType = {
          imageUrl: data.imageUrl,
          achievementTierType: data.achievementTierType,
          conditionType: data.conditionType,
          conditionValue: data.conditionValue,
          conditionElementId: data.conditionElementId,
          rewardId: data.rewardId,
          groupId: data.groupId
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
                key: existingAchievement.nameKey,
                value: t.value
              })
            }

            // --- 5. Validate translation records: check name la dc, desc cho trung---
            await this.translationRepo.validateTranslationRecords(translationRecords)

            // descriptionTranslations
            for (const t of data.descriptionTranslations ?? []) {
              translationRecords.push({
                languageId: langMap[t.key],
                key: existingAchievement.descriptionKey,
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

        // --- 7. Update Achievement chính ---
        const updatedAchievement = await this.AchievementRepo.update({
          id,
          updatedById,
          data: dataUpdate
        })

        return {
          data: updatedAchievement,
          message: this.i18nService.translate(AchievementMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new AchievementAlreadyExistsException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      await this.AchievementRepo.delete({
        id,
        deletedById
      })
      return {
        data: null,
        message: this.i18nService.translate(AchievementMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
