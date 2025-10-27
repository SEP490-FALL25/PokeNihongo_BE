import { I18nService } from '@/i18n/i18n.service'
import { GachaBannerMessage } from '@/i18n/message-keys'
import {
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import {
  addDaysUTC0000,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError,
  todayUTCWith0000ByDate
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { LanguagesRepository } from '../languages/languages.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entities'
import { TranslationRepository } from '../translation/translation.repo'
import {
  GachaBannerActiveLimitExceededException,
  GachaBannerAlreadyExistsException,
  GachaBannerInvalidDateRangeException
} from './dto/gacha-banner.error'
import {
  CreateGachaBannerBodyInputType,
  CreateGachaBannerBodyType,
  UpdateGachaBannerBodyInputType,
  UpdateGachaBannerBodyType
} from './entities/gacha-banner.entity'
import { GachaBannerRepo } from './gacha-banner.repo'

// Constant: Số lượng banner ACTIVE tối đa được phép
const MAX_ACTIVE_BANNERS = 2

@Injectable()
export class GachaBannerService {
  constructor(
    private gachaBannerRepo: GachaBannerRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository,
    private readonly translationRepo: TranslationRepository
  ) {}

  /**
   * Validate số lượng ACTIVE banners không vượt quá giới hạn
   * @param excludeId - ID của banner cần loại trừ khỏi việc đếm (dùng khi update)
   * @throws GachaBannerActiveLimitExceededException nếu số lượng ACTIVE đã đạt tối đa
   */
  private async validateActiveBannersLimit(excludeId?: number): Promise<void> {
    const activeCount = await this.gachaBannerRepo.countActiveBanners(excludeId)
    if (activeCount >= MAX_ACTIVE_BANNERS) {
      throw new GachaBannerActiveLimitExceededException()
    }
  }

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.gachaBannerRepo.list(pagination, langId ?? undefined)
    return {
      data,
      message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async listwithDetail(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.gachaBannerRepo.listwithDetail(
      pagination,
      langId ?? undefined
    )

    // Build languageId -> code map for all translations present
    const allLangIds: number[] = Array.from(
      new Set(
        (data.results || []).flatMap((item: any) =>
          (item.nameTranslations || []).map((t: any) => t.languageId)
        )
      )
    )
    const langs = await this.languageRepo.getWithListId(allLangIds)
    const idToCode = new Map(langs.map((l) => [l.id, l.code]))

    const results = (data.results || []).map((item: any) => {
      const translationsAll = (item.nameTranslations || []).map((t: any) => ({
        key: idToCode.get(t.languageId) || String(t.languageId),
        value: t.value
      }))
      const { nameTranslations, ...rest } = item
      return {
        ...rest,
        nameTranslations: translationsAll
      }
    })

    return {
      data: {
        ...data,
        results
      },
      message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(GachaBannerMessage.GET_SUCCESS, lang)
      }
    }

    const gachaBanner = await this.gachaBannerRepo.findByIdWithLangId(id, langId)
    if (!gachaBanner) {
      throw new NotFoundRecordException()
    }

    const data = {}
    const result = {
      ...gachaBanner,
      nameTranslation: (gachaBanner as any).nameTranslations?.[0]?.value ?? null
    }

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(GachaBannerMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateGachaBannerBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdGachaBanner: any = null

    try {
      // Validate ACTIVE banners limit nếu status là ACTIVE
      if (data.status === 'ACTIVE') {
        await this.validateActiveBannersLimit()
      }

      return await this.gachaBannerRepo.withTransaction(async (prismaTx) => {
        const nameKey = `gachaBanner.name.${Date.now()}`
        const now = new Date()

        // Normalize dates to 00:00 UTC and validate range
        const startDateNormalized = data.startDate
          ? todayUTCWith0000ByDate(data.startDate)
          : todayUTCWith0000ByDate(now)
        const endDateNormalized = data.endDate
          ? todayUTCWith0000ByDate(data.endDate)
          : addDaysUTC0000(startDateNormalized, 7)

        console.log('sDate: ' + startDateNormalized + ' eDate: ' + endDateNormalized)

        if (
          startDateNormalized &&
          endDateNormalized &&
          startDateNormalized > endDateNormalized
        ) {
          throw new GachaBannerInvalidDateRangeException()
        }

        // Convert data for create
        const dataCreate: CreateGachaBannerBodyType = {
          nameKey,
          startDate: startDateNormalized,
          endDate: endDateNormalized,
          status: data.status,
          hardPity5Star: data.hardPity5Star ?? 200,
          costRoll: data.costRoll ?? 100,
          amount5Star: data.amount5Star ?? 1,
          amount4Star: data.amount4Star ?? 3,
          amount3Star: data.amount3Star ?? 6,
          amount2Star: data.amount2Star ?? 8,
          amount1Star: data.amount1Star ?? 10
        }

        createdGachaBanner = await this.gachaBannerRepo.create(
          {
            createdById,
            data: dataCreate
          },
          prismaTx
        )

        // Now we have id, create proper nameKey
        const fNameKey = `gachaBanner.name.${createdGachaBanner.id}`

        const nameList = data.nameTranslations.map((t) => t.key)

        // Get unique language codes
        const allLangCodes = Array.from(new Set(nameList))

        // Get languages corresponding to the keys
        const languages = await this.languageRepo.getWithListCode(allLangCodes)

        // Create map { code: id } for quick access
        const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

        // Check if any language is missing
        const missingLangs = allLangCodes.filter((code) => !langMap[code])
        if (missingLangs.length > 0) {
          throw new LanguageNotExistToTranslateException()
        }

        // Create translation records (for validation only)
        const translationRecords: CreateTranslationBodyType[] = data.nameTranslations.map(
          (item) => ({
            languageId: langMap[item.key],
            key: fNameKey,
            value: item.value
          })
        )

        // Validate translations (check for duplicate names)
        await this.translationRepo.validateTranslationRecords(translationRecords)

        // Build nested upserts for name translations
        const nameUpserts = data.nameTranslations.map((item) => ({
          where: {
            languageId_key: { languageId: langMap[item.key], key: fNameKey }
          },
          update: { value: item.value },
          create: { languageId: langMap[item.key], key: fNameKey, value: item.value }
        }))

        const result = await this.gachaBannerRepo.update(
          {
            id: createdGachaBanner.id,
            data: {
              nameKey: fNameKey,
              ...(nameUpserts.length
                ? { nameTranslations: { upsert: nameUpserts as any } }
                : {})
            } as any
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(GachaBannerMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete gachaBanner if created
      if (createdGachaBanner?.id) {
        try {
          await this.gachaBannerRepo.delete(
            {
              id: createdGachaBanner.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new GachaBannerAlreadyExistsException()
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
      data: UpdateGachaBannerBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingGachaBanner: any = null

    try {
      // Validate ACTIVE banners limit nếu đang update sang ACTIVE
      if (data.status === 'ACTIVE') {
        await this.validateActiveBannersLimit(id)
      }

      return await this.gachaBannerRepo.withTransaction(async (prismaTx) => {
        // Get current record
        existingGachaBanner = await this.gachaBannerRepo.findById(id)
        if (!existingGachaBanner) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateGachaBannerBodyType> = {}

        // Normalize dates if provided
        const normalizedStart =
          data.startDate !== undefined
            ? data.startDate === null
              ? null
              : todayUTCWith0000ByDate(data.startDate)
            : (existingGachaBanner.startDate as Date | null)
        const normalizedEnd =
          data.endDate !== undefined
            ? data.endDate === null
              ? null
              : todayUTCWith0000ByDate(data.endDate)
            : (existingGachaBanner.endDate as Date | null)

        // Validate only when both sides available
        if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
          throw new GachaBannerInvalidDateRangeException()
        }

        if (data.startDate !== undefined) dataUpdate.startDate = normalizedStart as any
        if (data.endDate !== undefined) dataUpdate.endDate = normalizedEnd as any
        if (data.status !== undefined) dataUpdate.status = data.status
        if (data.hardPity5Star !== undefined)
          dataUpdate.hardPity5Star = data.hardPity5Star
        if (data.costRoll !== undefined) dataUpdate.costRoll = data.costRoll
        if (data.amount5Star !== undefined) dataUpdate.amount5Star = data.amount5Star
        if (data.amount4Star !== undefined) dataUpdate.amount4Star = data.amount4Star
        if (data.amount3Star !== undefined) dataUpdate.amount3Star = data.amount3Star
        if (data.amount2Star !== undefined) dataUpdate.amount2Star = data.amount2Star
        if (data.amount1Star !== undefined) dataUpdate.amount1Star = data.amount1Star

        // Handle translations if provided
        let nameUpserts: any[] = []
        if (data.nameTranslations) {
          const nameList = data.nameTranslations.map((t) => t.key)
          const allLangCodes = Array.from(new Set(nameList))

          if (allLangCodes.length > 0) {
            // Get languages
            const languages = await this.languageRepo.getWithListCode(allLangCodes)
            const langMap = Object.fromEntries(languages.map((l) => [l.code, l.id]))

            // Check missing language
            const missingLangs = allLangCodes.filter((code) => !langMap[code])
            if (missingLangs.length > 0) throw new LanguageNotExistToTranslateException()

            // Create translation records for validation
            const translationRecords: CreateTranslationBodyType[] = []
            for (const t of data.nameTranslations) {
              translationRecords.push({
                languageId: langMap[t.key],
                key: existingGachaBanner.nameKey,
                value: t.value
              })
            }
            await this.translationRepo.validateTranslationRecords(translationRecords)

            // Nested upserts for translations
            nameUpserts = (data.nameTranslations ?? []).map((t) => ({
              where: {
                languageId_key: {
                  languageId: (t.key && (langMap as any)[t.key]) as number,
                  key: existingGachaBanner.nameKey
                }
              },
              update: { value: t.value },
              create: {
                languageId: (t.key && (langMap as any)[t.key]) as number,
                key: existingGachaBanner.nameKey,
                value: t.value
              }
            }))
          }
        }

        // Update GachaBanner main record
        const updatedGachaBanner = await this.gachaBannerRepo.update(
          {
            id,
            updatedById,
            data: {
              ...dataUpdate,
              ...(nameUpserts.length
                ? { nameTranslations: { upsert: nameUpserts as any } }
                : {})
            } as any
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedGachaBanner,
          message: this.i18nService.translate(GachaBannerMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new GachaBannerAlreadyExistsException()
      }
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
      const existingGachaBanner = await this.gachaBannerRepo.findById(id)
      if (!existingGachaBanner) {
        throw new NotFoundRecordException()
      }

      await Promise.all([
        this.gachaBannerRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingGachaBanner.nameKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(GachaBannerMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  // async getByToday(lang: string = 'vi', userId?: number) {
  //   try {
  //     console.log(userId)

  //     const date = todayUTCWith0000()
  //     const langId = await this.languageRepo.getIdByCode(lang)

  //     if (!langId) {
  //       return {
  //         statusCode: HttpStatus.OK,
  //         data: [],
  //         message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang)
  //       }
  //     }

  //     const banners = await this.gachaBannerRepo.findValidByDateWithLangId(date, langId)

  //     // If we have a userId, compute canBuy per item based on their total purchased quantities
  //     if (userId) {
  //       // Collect unique item IDs
  //       const itemIds = Array.from(
  //         new Set(banners.flatMap((b: any) => (b.shopItems || []).map((i: any) => i.id)))
  //       )

  //       // Fetch totals in parallel
  //       const totals = await Promise.all(
  //         itemIds.map(async (itemId) => ({
  //           itemId,
  //           total: await this.shopPurchaseRepo.getTotalPurchasedQuantityByUserAndItem(
  //             userId,
  //             itemId
  //           )
  //         }))
  //       )
  //       const totalMap = new Map<number, number>(totals.map((t) => [t.itemId, t.total]))

  //       // Fetch user's owned pokemons
  //       const userPokemons = await this.userPokemonRepo.getByUserId(userId)
  //       const ownedPokemonIds = new Set<number>(
  //         (userPokemons || []).map((up: any) => up.pokemonId)
  //       )

  //       const data = banners.map((b: any) => ({
  //         ...b,
  //         shopItems: (b.shopItems || []).map((it: any) => {
  //           // 1. Nếu user đã sở hữu pokemon này → canBuy = false
  //           const ownsTarget = ownedPokemonIds.has(it.pokemonId)
  //           if (ownsTarget) {
  //             return { ...it, canBuy: false }
  //           }

  //           // 2. Kiểm tra previousPokemons
  //           const prevList = it.pokemon?.previousPokemons || []

  //           // 2a. Nếu previousPokemons là [] (không có tiền nhiệm) → canBuy = true (nếu đủ limit)
  //           if (prevList.length === 0) {
  //             const limit = it.purchaseLimit
  //             const bought = totalMap.get(it.id) ?? 0
  //             const withinLimit = limit == null ? true : bought < limit
  //             return { ...it, canBuy: withinLimit }
  //           }

  //           // 2b. Nếu có previousPokemons, check xem user có sở hữu ít nhất 1 con trong list không
  //           const ownsPrev = prevList.some(
  //             (prev: any) => prev?.id && ownedPokemonIds.has(prev.id)
  //           )

  //           // Nếu không sở hữu bất kỳ pokemon tiền nhiệm nào → canBuy = false
  //           if (!ownsPrev) {
  //             return { ...it, canBuy: false }
  //           }

  //           // 3. Nếu sở hữu pokemon tiền nhiệm, kiểm tra purchase limit
  //           const limit = it.purchaseLimit
  //           const bought = totalMap.get(it.id) ?? 0
  //           const withinLimit = limit == null ? true : bought < limit
  //           return { ...it, canBuy: withinLimit }
  //         })
  //       }))

  //       return {
  //         statusCode: HttpStatus.OK,
  //         data,
  //         message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang)
  //       }
  //     }

  //     // No user: default canBuy to true for all items
  //     const data = banners.map((b: any) => ({
  //       ...b,
  //       shopItems: (b.shopItems || []).map((it: any) => ({ ...it, canBuy: true }))
  //     }))

  //     return {
  //       statusCode: HttpStatus.OK,
  //       data,
  //       message: this.i18nService.translate(GachaBannerMessage.GET_LIST_SUCCESS, lang)
  //     }
  //   } catch (error) {
  //     throw error
  //   }
  // }
}
