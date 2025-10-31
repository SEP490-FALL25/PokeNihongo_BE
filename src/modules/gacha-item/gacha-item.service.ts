import { RarityPokemonType } from '@/common/constants/pokemon.constant'
import { GachaBannerStatus } from '@/common/constants/shop-banner.constant'
import { I18nService } from '@/i18n/i18n.service'
import { GachaItemMessage } from '@/i18n/message-keys'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { GachaStarType, RarityPokemon } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { GachaBannerRepo } from '../gacha-banner/gacha-banner.repo'
import { GachaItemRateRepo } from '../gacha-item-rate/gacha-item-rate.repo'
import { PokemonRepo } from '../pokemon/pokemon.repo'
import {
  GachaBannerActiveException,
  GachaBannerExpiredException,
  GachaBannerInactiveException,
  GachaItemNotFoundException,
  InvalidGachaBannerException,
  MaxGachaItemsExceededException,
  PokemonDuplicateInGachaException,
  PokemonInvalidRarityWithStarTypeToAddException
} from './dto/gacha-item.error'
import {
  CreateWithListItemBodyType,
  GetRamdomAmountGachaItemsBodyType,
  UpdateWithListGachaItemBodyType
} from './entities/gacha-item.entity'
import { GachaItemRepo } from './gacha-item.repo'

const STAR_TYPE_TO_RARITY: Record<GachaStarType, RarityPokemonType> = {
  [GachaStarType.ONE]: RarityPokemon.COMMON,
  [GachaStarType.TWO]: RarityPokemon.UNCOMMON,
  [GachaStarType.THREE]: RarityPokemon.RARE,
  [GachaStarType.FOUR]: RarityPokemon.EPIC,
  [GachaStarType.FIVE]: RarityPokemon.LEGENDARY
}

const RARITY_TO_STAR_TYPE: Record<RarityPokemon, GachaStarType> = {
  [RarityPokemon.COMMON]: GachaStarType.ONE,
  [RarityPokemon.UNCOMMON]: GachaStarType.TWO,
  [RarityPokemon.RARE]: GachaStarType.THREE,
  [RarityPokemon.EPIC]: GachaStarType.FOUR,
  [RarityPokemon.LEGENDARY]: GachaStarType.FIVE
}

@Injectable()
export class GachaItemService {
  constructor(
    private gachaItemRepo: GachaItemRepo,
    @Inject(forwardRef(() => GachaBannerRepo))
    private gachaBannerRepo: GachaBannerRepo,
    private gachaItemRateRepo: GachaItemRateRepo,
    private pokemonRepo: PokemonRepo,
    private readonly i18nService: I18nService,
    private readonly prismaService: PrismaService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.gachaItemRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(GachaItemMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const gachaItem = await this.gachaItemRepo.findById(id)
    if (!gachaItem) {
      throw new GachaItemNotFoundException()
    }
    return {
      statusCode: 200,
      data: gachaItem,
      message: this.i18nService.translate(GachaItemMessage.GET_DETAIL_SUCCESS, lang)
    }
  }

  private async validateGachaBannerForCreate(bannerId: number) {
    const banner = await this.gachaBannerRepo.findById(bannerId)
    if (!banner) throw new InvalidGachaBannerException()
    if (banner.status === GachaBannerStatus.INACTIVE)
      throw new GachaBannerInactiveException()
    if (banner.status === GachaBannerStatus.ACTIVE) throw new GachaBannerActiveException()
    if (banner.status === GachaBannerStatus.EXPIRED)
      throw new GachaBannerExpiredException()
    return banner
  }

  private async validateItemCountByStarType(
    banner: any,
    starType: GachaStarType,
    additionalCount: number = 1
  ) {
    const currentCount = await this.gachaItemRepo.countItemsByStarType(
      banner.id,
      starType
    )
    const limitMap = {
      [GachaStarType.ONE]: banner.amount1Star,
      [GachaStarType.TWO]: banner.amount2Star,
      [GachaStarType.THREE]: banner.amount3Star,
      [GachaStarType.FOUR]: banner.amount4Star,
      [GachaStarType.FIVE]: banner.amount5Star
    }
    if (currentCount + additionalCount > limitMap[starType]) {
      throw new MaxGachaItemsExceededException()
    }
  }

  /**
   * OPTIMIZED: Batch queries instead of loop
   */
  async createByList(
    createdById: number,
    data: CreateWithListItemBodyType,
    lang: string = 'vi'
  ) {
    const { bannerId, items } = data
    const banner = await this.validateGachaBannerForCreate(bannerId)

    // Collect IDs
    const allPokemonIds = new Set<number>()
    const starTypes = new Set<GachaStarType>()
    items.forEach((item) => {
      starTypes.add(item.starType)
      item.pokemons.forEach((id) => allPokemonIds.add(id))
    })

    // Batch fetch rates
    const rates = await Promise.all(
      Array.from(starTypes).map((st) => this.gachaItemRateRepo.getByType(st))
    )
    const rateMap = new Map<GachaStarType, number>()
    rates.forEach((r, i) => r && rateMap.set(Array.from(starTypes)[i], r.id))

    // Batch fetch pokemons
    const pokemons = await Promise.all(
      Array.from(allPokemonIds).map((id) => this.pokemonRepo.findById(id))
    )
    const pokemonMap = new Map(pokemons.filter((p) => p).map((p) => [p!.id, p!]))

    // Prepare items
    const itemsToCreate: Array<{
      bannerId: number
      pokemonId: number
      gachaItemRateId: number
      starType: GachaStarType
    }> = []

    for (const item of items) {
      const rateId = rateMap.get(item.starType)
      if (!rateId) throw new NotFoundRecordException()

      for (const pokemonId of item.pokemons) {
        const pokemon = pokemonMap.get(pokemonId)
        if (!pokemon) throw new NotFoundRecordException()

        if (RARITY_TO_STAR_TYPE[pokemon.rarity] !== item.starType)
          throw new PokemonInvalidRarityWithStarTypeToAddException(
            `pokedex_number: ${pokemon.pokedex_number}`
          )

        itemsToCreate.push({
          bannerId,
          pokemonId,
          gachaItemRateId: rateId,
          starType: item.starType
        })
      }
    }

    // Check duplicates (batch)
    const existing = await this.gachaItemRepo.list({
      currentPage: 1,
      pageSize: 1000,
      qs: `bannerId=${bannerId}`
    })
    const existingIds = new Set(existing.results.map((i) => i.pokemonId))
    if (itemsToCreate.some((i) => existingIds.has(i.pokemonId))) {
      throw new PokemonDuplicateInGachaException()
    }

    // Validate counts
    const counts: Record<GachaStarType, number> = {
      [GachaStarType.ONE]: 0,
      [GachaStarType.TWO]: 0,
      [GachaStarType.THREE]: 0,
      [GachaStarType.FOUR]: 0,
      [GachaStarType.FIVE]: 0
    }
    itemsToCreate.forEach((i) => counts[i.starType]++)
    for (const [st, count] of Object.entries(counts)) {
      if (count > 0)
        await this.validateItemCountByStarType(banner, st as GachaStarType, count)
    }

    // Create (single batch query)
    try {
      const created = await this.gachaItemRepo.createMany({
        createdById,
        items: itemsToCreate
      })
      return {
        statusCode: 200,
        data: created,
        message: this.i18nService.translate(GachaItemMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isForeignKeyConstraintPrismaError(error))
        throw new InvalidGachaBannerException()
      throw error
    }
  }

  /**
   * OPTIMIZED: Use deleteMany instead of loop
   */
  async updateByList(
    updatedById: number,
    data: UpdateWithListGachaItemBodyType,
    lang: string = 'vi'
  ) {
    const { bannerId, items } = data
    const banner = await this.validateGachaBannerForCreate(bannerId)

    // Delete old items (single query)
    await this.prismaService.gachaItem.deleteMany({ where: { bannerId } })

    // Reuse createByList logic
    const allPokemonIds = new Set<number>()
    const starTypes = new Set<GachaStarType>()
    items.forEach((item) => {
      starTypes.add(item.starType)
      item.pokemons.forEach((id) => allPokemonIds.add(id))
    })

    const rates = await Promise.all(
      Array.from(starTypes).map((st) => this.gachaItemRateRepo.getByType(st))
    )
    const rateMap = new Map<GachaStarType, number>()
    rates.forEach((r, i) => r && rateMap.set(Array.from(starTypes)[i], r.id))

    const pokemons = await Promise.all(
      Array.from(allPokemonIds).map((id) => this.pokemonRepo.findById(id))
    )
    const pokemonMap = new Map(pokemons.filter((p) => p).map((p) => [p!.id, p!]))

    const itemsToCreate: Array<{
      bannerId: number
      pokemonId: number
      gachaItemRateId: number
      starType: GachaStarType
    }> = []

    for (const item of items) {
      const rateId = rateMap.get(item.starType)
      if (!rateId) throw new NotFoundRecordException()

      for (const pokemonId of item.pokemons) {
        const pokemon = pokemonMap.get(pokemonId)
        if (!pokemon) throw new NotFoundRecordException()

        if (RARITY_TO_STAR_TYPE[pokemon.rarity] !== item.starType)
          throw new PokemonInvalidRarityWithStarTypeToAddException()

        itemsToCreate.push({
          bannerId,
          pokemonId,
          gachaItemRateId: rateId,
          starType: item.starType
        })
      }
    }

    const counts: Record<GachaStarType, number> = {
      [GachaStarType.ONE]: 0,
      [GachaStarType.TWO]: 0,
      [GachaStarType.THREE]: 0,
      [GachaStarType.FOUR]: 0,
      [GachaStarType.FIVE]: 0
    }
    itemsToCreate.forEach((i) => counts[i.starType]++)
    for (const [st, count] of Object.entries(counts)) {
      if (count > 0)
        await this.validateItemCountByStarType(banner, st as GachaStarType, count)
    }

    try {
      const created = await this.gachaItemRepo.createMany({
        createdById: updatedById,
        items: itemsToCreate
      })
      return {
        statusCode: 200,
        data: created,
        message: this.i18nService.translate(GachaItemMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isForeignKeyConstraintPrismaError(error))
        throw new InvalidGachaBannerException()
      throw error
    }
  }

  async getRandomListItem(data: GetRamdomAmountGachaItemsBodyType, lang: string = 'vi') {
    const { bannerId, items } = data
    const banner = await this.gachaBannerRepo.findById(bannerId)
    if (!banner) throw new InvalidGachaBannerException()

    const amounts: Record<GachaStarType, number> = {
      [GachaStarType.ONE]: banner.amount1Star,
      [GachaStarType.TWO]: banner.amount2Star,
      [GachaStarType.THREE]: banner.amount3Star,
      [GachaStarType.FOUR]: banner.amount4Star,
      [GachaStarType.FIVE]: banner.amount5Star
    }

    const results: Array<{ starType: GachaStarType; pokemons: any[] }> = []

    for (const item of items) {
      const limit = amounts[item.starType]
      if (limit === 0) continue

      const rarity = STAR_TYPE_TO_RARITY[item.starType]
      const pokemons = await this.pokemonRepo.getRandomPokemonsByTypeAndRarity({
        limit,
        rarity,
        typeIds: item.typeIds,
        excludeIds: []
      })

      results.push({ starType: item.starType, pokemons })
    }

    return {
      statusCode: 200,
      data: { bannerId, items: results },
      message: this.i18nService.translate(GachaItemMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async delete(id: number, lang: string = 'vi') {
    try {
      await this.gachaItemRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(GachaItemMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) throw new GachaItemNotFoundException()
      throw error
    }
  }

  async getListPokemonWithGachaBannerId({
    bannerId,
    query,
    lang
  }: {
    bannerId: number
    query: PaginationQueryDTO
    lang: string
  }) {
    const data = await this.gachaItemRepo.getListPokemonWithGachaBannerId(bannerId, query)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(GachaItemMessage.GET_LIST_SUCCESS, lang)
    }
  }
}
