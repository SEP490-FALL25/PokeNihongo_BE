import { I18nService } from '@/i18n/i18n.service'
import { DailyRequestCategoryMessage } from '@/i18n/message-keys'
import {
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { DailyRequestRepo } from '../daily-request/daily-request.repo'
import { LanguagesRepository } from '../languages/languages.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entities'
import { TranslationRepository } from '../translation/translation.repo'
import { DailyRequestCategoryRepo } from './daily-request-category.repo'
import { DailyRequestCategoryAlreadyExistsException } from './dto/daily-request-category.error'
import {
  CreateDailyRequestCategoryBodyInputType,
  CreateDailyRequestCategoryBodyType,
  UpdateDailyRequestCategoryBodyInputType
} from './entities/daily-request-category.entity'

@Injectable()
export class DailyRequestCategoryService {
  constructor(
    private DailyRequestCategoryRepo: DailyRequestCategoryRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository,
    private readonly translationRepo: TranslationRepository,
    private readonly dailyRequestRepo: DailyRequestRepo
  ) {}
  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId) {
      throw new NotFoundRecordException()
    }
    const data = await this.DailyRequestCategoryRepo.list(pagination, langId)
    return {
      data,
      message: this.i18nService.translate(
        DailyRequestCategoryMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  /**
   * Return categories with their dailyRequests (with translations)
   */
  async listWithDailyRequest(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId) {
      throw new NotFoundRecordException()
    }

    const data = await this.DailyRequestCategoryRepo.list(pagination, langId)

    // Attach dailyRequests for categories in this page
    const categoryIds = data.results.map((c: any) => c.id)
    if (categoryIds.length > 0) {
      const dailyRequests = await this.dailyRequestRepo.findByWhere({
        dailyRequestCategoryIds: { in: categoryIds }
      })

      const translationKeys: string[] = []
      dailyRequests.forEach((dr: any) => {
        if (dr.nameKey) translationKeys.push(dr.nameKey)
        if (dr.descriptionKey) translationKeys.push(dr.descriptionKey)
      })

      const translations = await this.translationRepo.findByKeysAndLanguage(
        Array.from(new Set(translationKeys)),
        langId
      )
      const translationMap = new Map<string, string>()
      translations.forEach((t) => translationMap.set(t.key, t.value))

      const grouped = dailyRequests.reduce((acc: any, dr: any) => {
        const list = acc[dr.dailyRequestCategoryId] || []
        list.push({
          ...dr,
          nameTranslation: translationMap.get(dr.nameKey) || '',
          descriptionTranslation: translationMap.get(dr.descriptionKey) || null
        })
        acc[dr.dailyRequestCategoryId] = list
        return acc
      }, {})

      data.results = data.results.map((c: any) => ({
        ...c,
        dailyRequests: grouped[c.id] || []
      }))
    }

    return {
      data,
      message: this.i18nService.translate(
        DailyRequestCategoryMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const DailyRequestCategory = await this.DailyRequestCategoryRepo.findById(id)
    const langId = await this.languageRepo.getIdByCode(lang)
    if (!langId || !DailyRequestCategory) {
      throw new NotFoundRecordException()
    }

    const nameTranslation = await this.translationRepo.findByLangAndKey(
      langId,
      DailyRequestCategory.nameKey
    )

    const resultRes = {
      ...DailyRequestCategory,
      nameTranslation: nameTranslation?.value ?? null
    }
    return {
      statusCode: HttpStatus.OK,
      data: resultRes,
      message: this.i18nService.translate(DailyRequestCategoryMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateDailyRequestCategoryBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdDailyRequestCategory: any = null

    try {
      return await this.DailyRequestCategoryRepo.withTransaction(async (prismaTx) => {
        const nameKey = `daily_request_category.name.${Date.now()}`

        //convert data cho create
        const dataCreate: CreateDailyRequestCategoryBodyType = {
          nameKey: nameKey,
          isStreat: data.isStreat
        }

        createdDailyRequestCategory = await this.DailyRequestCategoryRepo.create(
          {
            createdById,
            data: dataCreate
          },
          prismaTx
        )

        // co id, tao nameKey chuan
        const fNameKey = `daily_request_category.name.${createdDailyRequestCategory.id}`

        const nameList = data.nameTranslations.map((t) => t.key)

        // Gộp & loại bỏ trùng key
        const allLangCodes = Array.from(new Set([...nameList]))

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

        //check khong cho trung name
        await this.translationRepo.validateTranslationRecords(translationRecords)

        // Sử dụng createOrUpdate thay vì createMany
        // và dùng transaction

        const translationPromises = translationRecords.map((record) =>
          this.translationRepo.createOrUpdateWithTransaction(record, prismaTx)
        )
        await Promise.all(translationPromises)
        // Thêm bản dịch và update lại daily request
        const result = await this.DailyRequestCategoryRepo.update(
          {
            id: createdDailyRequestCategory.id,
            data: {
              nameKey: fNameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(
            DailyRequestCategoryMessage.CREATE_SUCCESS,
            lang
          )
        }
      })
    } catch (error) {
      // Rollback: Xóa daily request đã tạo nếu có lỗi
      if (createdDailyRequestCategory?.id) {
        try {
          await this.DailyRequestCategoryRepo.delete(
            {
              id: createdDailyRequestCategory.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new DailyRequestCategoryAlreadyExistsException()
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
      data: UpdateDailyRequestCategoryBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingDailyRequestCategory: any = null

    try {
      return await this.DailyRequestCategoryRepo.withTransaction(async (prismaTx) => {
        // --- 1. Lấy bản ghi hiện tại ---
        existingDailyRequestCategory = await this.DailyRequestCategoryRepo.findById(id)
        if (!existingDailyRequestCategory) throw new NotFoundRecordException()

        // --- 3. Handle translations nếu có ---
        if (data.nameTranslations) {
          const nameList = data.nameTranslations?.map((t) => t.key) ?? []

          const allLangCodes = Array.from(new Set([...nameList]))

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
                key: existingDailyRequestCategory.nameKey,
                value: t.value
              })
            }

            // --- 5. Validate translation records: check name la dc, desc cho trung---
            await this.translationRepo.validateTranslationRecords(translationRecords)

            // --- 6. Update translations với transaction ---
            const translationPromises = translationRecords.map((record) =>
              this.translationRepo.createOrUpdateWithTransaction(record, prismaTx)
            )
            await Promise.all(translationPromises)
          }
        }

        // --- 7. Update DailyRequestCategory chính ---
        const updatedDailyRequestCategory = await this.DailyRequestCategoryRepo.update(
          {
            id,
            updatedById,
            data: {
              isStreat: data.isStreat
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedDailyRequestCategory,
          message: this.i18nService.translate(
            DailyRequestCategoryMessage.UPDATE_SUCCESS,
            lang
          )
        }
      })
    } catch (error) {
      // --- 8. Xử lý lỗi ---
      if (isNotFoundPrismaError(error)) throw new NotFoundRecordException()
      if (isUniqueConstraintPrismaError(error))
        throw new DailyRequestCategoryAlreadyExistsException()
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      const [langId, existingDailyRequestCategory] = await Promise.all([
        this.languageRepo.getIdByCode(lang),
        this.DailyRequestCategoryRepo.findById(id)
      ])
      if (!langId) {
        throw new NotFoundRecordException()
      }

      if (!existingDailyRequestCategory) {
        throw new NotFoundRecordException()
      }

      const [,] = await Promise.all([
        this.DailyRequestCategoryRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingDailyRequestCategory.nameKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(
          DailyRequestCategoryMessage.DELETE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
