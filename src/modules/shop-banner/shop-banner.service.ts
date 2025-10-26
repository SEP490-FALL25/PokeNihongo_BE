import { I18nService } from '@/i18n/i18n.service'
import { ShopBannerMessage } from '@/i18n/message-keys'
import {
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import {
  addDaysUTC0000,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError,
  todayUTCWith0000,
  todayUTCWith0000ByDate
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { HttpStatus, Injectable } from '@nestjs/common'
import { LanguagesRepository } from '../languages/languages.repo'
import { UserPokemonRepo } from '../user-pokemon/user-pokemon.repo'
import { ShopPurchaseRepo } from '../shop-purchase/shop-purchase.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entities'
import { TranslationRepository } from '../translation/translation.repo'
import {
  ShopBannerAlreadyExistsException,
  ShopBannerInvalidDateRangeException
} from './dto/shop-bannererror'
import {
  CreateShopBannerBodyInputType,
  CreateShopBannerBodyType,
  UpdateShopBannerBodyInputType,
  UpdateShopBannerBodyType
} from './entities/shop-banner.entity'
import { ShopBannerRepo } from './shop-banner.repo'

@Injectable()
export class ShopBannerService {
  constructor(
    private shopBannerRepo: ShopBannerRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository,
    private readonly translationRepo: TranslationRepository,
    private readonly shopPurchaseRepo: ShopPurchaseRepo,
    private readonly userPokemonRepo: UserPokemonRepo
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.shopBannerRepo.list(pagination, langId ?? undefined)
    return {
      data,
      message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async listwithDetail(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.shopBannerRepo.listwithDetail(pagination, langId ?? undefined)

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
        // nameTranslation: item.nameTranslation // keep single current-lang value for compatibility
      }
    })

    return {
      data: {
        ...data,
        results
      },
      message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(ShopBannerMessage.GET_SUCCESS, lang)
      }
    }

    const shopBanner = await this.shopBannerRepo.findByIdWithLangId(id, langId)
    if (!shopBanner) {
      throw new NotFoundRecordException()
    }

    const data = {}
    const result = {
      ...shopBanner,
      nameTranslation: (shopBanner as any).nameTranslations?.[0]?.value ?? null,
      descriptionTranslation:
        (shopBanner as any).descriptionTranslations?.[0]?.value ?? null
    }

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(ShopBannerMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateShopBannerBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdShopBanner: any = null

    try {
      return await this.shopBannerRepo.withTransaction(async (prismaTx) => {
        const nameKey = `shopBanner.name.${Date.now()}`
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
          throw new ShopBannerInvalidDateRangeException()
        }

        // Convert data for create
        const dataCreate: CreateShopBannerBodyType = {
          nameKey,
          startDate: startDateNormalized,
          endDate: endDateNormalized,
          status: data.status
        }

        createdShopBanner = await this.shopBannerRepo.create(
          {
            createdById,
            data: dataCreate
          },
          prismaTx
        )

        // Now we have id, create proper nameKey
        const fNameKey = `shopBanner.name.${createdShopBanner.id}`

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

        const result = await this.shopBannerRepo.update(
          {
            id: createdShopBanner.id,
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
          message: this.i18nService.translate(ShopBannerMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete shopBanner if created
      if (createdShopBanner?.id) {
        try {
          await this.shopBannerRepo.delete(
            {
              id: createdShopBanner.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new ShopBannerAlreadyExistsException()
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
      data: UpdateShopBannerBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingShopBanner: any = null

    try {
      return await this.shopBannerRepo.withTransaction(async (prismaTx) => {
        // Get current record
        existingShopBanner = await this.shopBannerRepo.findById(id)
        if (!existingShopBanner) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateShopBannerBodyType> = {}

        // Normalize dates if provided
        const normalizedStart =
          data.startDate !== undefined
            ? data.startDate === null
              ? null
              : todayUTCWith0000ByDate(data.startDate)
            : (existingShopBanner.startDate as Date | null)
        const normalizedEnd =
          data.endDate !== undefined
            ? data.endDate === null
              ? null
              : todayUTCWith0000ByDate(data.endDate)
            : (existingShopBanner.endDate as Date | null)

        // Validate only when both sides available
        if (normalizedStart && normalizedEnd && normalizedStart > normalizedEnd) {
          throw new ShopBannerInvalidDateRangeException()
        }

        if (data.startDate !== undefined) dataUpdate.startDate = normalizedStart as any
        if (data.endDate !== undefined) dataUpdate.endDate = normalizedEnd as any
        if (data.status !== undefined) dataUpdate.status = data.status

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
                key: existingShopBanner.nameKey,
                value: t.value
              })
            }
            await this.translationRepo.validateTranslationRecords(translationRecords)

            // Nested upserts for translations
            nameUpserts = (data.nameTranslations ?? []).map((t) => ({
              where: {
                languageId_key: {
                  languageId: (t.key && (langMap as any)[t.key]) as number,
                  key: existingShopBanner.nameKey
                }
              },
              update: { value: t.value },
              create: {
                languageId: (t.key && (langMap as any)[t.key]) as number,
                key: existingShopBanner.nameKey,
                value: t.value
              }
            }))
          }
        }

        // Update ShopBanner main record
        const updatedShopBanner = await this.shopBannerRepo.update(
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
          data: updatedShopBanner,
          message: this.i18nService.translate(ShopBannerMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new ShopBannerAlreadyExistsException()
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
      const existingShopBanner = await this.shopBannerRepo.findById(id)
      if (!existingShopBanner) {
        throw new NotFoundRecordException()
      }

      await Promise.all([
        this.shopBannerRepo.delete({
          id,
          deletedById
        }),
        this.translationRepo.deleteByKey(existingShopBanner.nameKey)
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(ShopBannerMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getByToday(lang: string = 'vi', userId?: number) {
    try {
      const date = todayUTCWith0000()
      const langId = await this.languageRepo.getIdByCode(lang)

      if (!langId) {
        return {
          statusCode: HttpStatus.OK,
          data: [],
          message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
        }
      }

  const banners = await this.shopBannerRepo.findValidByDateWithLangId(date, langId)

      // If we have a userId, compute canBuy per item based on their total purchased quantities
      if (userId) {
        // Collect unique item IDs
        const itemIds = Array.from(
          new Set(banners.flatMap((b: any) => (b.shopItems || []).map((i: any) => i.id)))
        )

        // Fetch totals in parallel
        const totals = await Promise.all(
          itemIds.map(async (itemId) => ({
            itemId,
            total: await this.shopPurchaseRepo.getTotalPurchasedQuantityByUserAndItem(
              userId,
              itemId
            )
          }))
        )
        const totalMap = new Map<number, number>(totals.map((t) => [t.itemId, t.total]))

        // Fetch user's owned pokemons
        const userPokemons = await this.userPokemonRepo.getByUserId(userId)
        const ownedPokemonIds = new Set<number>(
          (userPokemons || []).map((up: any) => up.pokemonId)
        )

        const data = banners.map((b: any) => ({
          ...b,
          shopItems: (b.shopItems || []).map((it: any) => {
            const limit = it.purchaseLimit
            const bought = totalMap.get(it.id) ?? 0
            const withinLimit = limit == null ? true : bought < limit
            const ownsTarget = ownedPokemonIds.has(it.pokemonId)
            const prevList = it.pokemon?.previousPokemons || []
            const requiresPrev = prevList.length > 0
            const ownsPrev = !requiresPrev
              ? true
              : prevList.some((prev: any) => prev?.id && ownedPokemonIds.has(prev.id))

            const canBuy = withinLimit && !ownsTarget && ownsPrev
            return { ...it, canBuy }
          })
        }))

        return {
          statusCode: HttpStatus.OK,
          data,
          message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
        }
      }

      // No user: default canBuy to true for all items
      const data = banners.map((b: any) => ({
        ...b,
        shopItems: (b.shopItems || []).map((it: any) => ({ ...it, canBuy: true }))
      }))

      return {
        statusCode: HttpStatus.OK,
        data,
        message: this.i18nService.translate(ShopBannerMessage.GET_LIST_SUCCESS, lang)
      }
    } catch (error) {
      throw error
    }
  }
}
