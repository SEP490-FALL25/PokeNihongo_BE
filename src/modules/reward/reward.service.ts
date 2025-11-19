import { FeatureKey } from '@/common/constants/subscription.constant'
import { I18nService } from '@/i18n/i18n.service'
import { RewardMessage } from '@/i18n/message-keys'
import {
  InvalidForeignKeyConstraintException,
  LanguageNotExistToTranslateException,
  NotFoundRecordException
} from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { SharedUserSubscriptionService } from '@/shared/services/user-subscription.service'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import {
  RarityPokemon,
  RewardTarget,
  UserRewardSourceType,
  WalletType
} from '@prisma/client'
import { LanguagesRepository } from '../languages/languages.repo'
import { PokemonRepo } from '../pokemon/pokemon.repo'
import { CreateTranslationBodyType } from '../translation/entities/translation.entities'
import { TranslationRepository } from '../translation/translation.repo'
import { UserPokemonRepo } from '../user-pokemon/user-pokemon.repo'
import { CreateUserRewardHistoryBodyType } from '../user-reward-history/entities/user-reward-history.entities'
import { UserRewardHistoryService } from '../user-reward-history/user-reward-history.service'
import { UserService } from '../user/user.service'
import { WalletRepo } from '../wallet/wallet.repo'
import { RewardAlreadyExistsException } from './dto/reward.error'
import {
  CreateRewardBodyInputType,
  CreateRewardBodyType,
  UpdateRewardBodyInputType,
  UpdateRewardBodyType
} from './entities/reward.entity'
import { RewardRepo } from './reward.repo'

@Injectable()
export class RewardService {
  constructor(
    private rewardRepo: RewardRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository,
    private readonly translationRepo: TranslationRepository,
    private readonly userService: UserService,
    private readonly walletRepo: WalletRepo,
    private readonly pokemonRepo: PokemonRepo,
    private readonly userPokemonRepo: UserPokemonRepo,
    private readonly userRewardHistoryService: UserRewardHistoryService,
    private readonly userSubService: SharedUserSubscriptionService
  ) {}

  private readonly logger = new Logger(RewardService.name)

  private pushHistoryEntry(
    entries: CreateUserRewardHistoryBodyType[],
    params: {
      userId: number
      rewardId?: number
      target: RewardTarget
      amount?: number | null
      note?: string
      meta?: Record<string, any>
    }
  ) {
    const payload = this.userRewardHistoryService.createEntryPayload({
      userId: params.userId,
      rewardId: params.rewardId,
      rewardTargetSnapshot: params.target as any,
      amount: params.amount ?? null,
      sourceType: 'REWARD_SERVICE',
      note: params.note,
      meta: params.meta
    })
    entries.push(payload)
  }

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.rewardRepo.list(pagination, langId ?? undefined)
    return {
      data,
      message: this.i18nService.translate(RewardMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async getListWithAllLang(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.rewardRepo.getListWithAllLang(pagination, langId ?? undefined)

    // Build language code map for all referenced languageIds
    const allLangIds = new Set<number>()
    for (const item of data.results as any[]) {
      for (const t of item.nameTranslations ?? []) allLangIds.add(t.languageId)
    }
    const languages = await this.languageRepo.getWithListId(Array.from(allLangIds))
    const codeMap = Object.fromEntries(languages.map((l) => [l.id, l.code]))

    const results = (data.results as any[]).map((item) => ({
      ...item,
      nameTranslations: (item.nameTranslations ?? []).map((t: any) => ({
        key: codeMap[t.languageId] ?? String(t.languageId),
        value: t.value
      }))
    }))

    return {
      data: { ...data, results },
      message: this.i18nService.translate(RewardMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)

    if (!langId) {
      return {
        data: null,
        message: this.i18nService.translate(RewardMessage.GET_SUCCESS, lang)
      }
    }

    const reward = await this.rewardRepo.findByIdWithLangId(id, langId)
    if (!reward) {
      throw new NotFoundRecordException()
    }

    const data = {}
    const result = {
      ...reward,
      nameTranslation: (reward as any).nameTranslations?.[0]?.value ?? null,
      descriptionTranslation: (reward as any).descriptionTranslations?.[0]?.value ?? null
    }

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(RewardMessage.GET_SUCCESS, lang)
    }
  }

  async findByIdWithAllLang(id: number, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)

    const reward: any = await this.rewardRepo.findByIdWithAllLang(id)
    if (!reward) {
      throw new NotFoundRecordException()
    }

    // derive single-language name for current lang if available
    const nameTranslation = langId
      ? (reward.nameTranslations?.find((t: any) => t.languageId === langId)?.value ??
        null)
      : null

    // map array to { key: code, value }
    const languages = await this.languageRepo.getWithListId(
      Array.from(new Set((reward.nameTranslations ?? []).map((t: any) => t.languageId)))
    )
    const codeMap = Object.fromEntries(languages.map((l) => [l.id, l.code]))

    const result = {
      ...reward,
      nameTranslations: (reward.nameTranslations ?? []).map((t: any) => ({
        key: codeMap[t.languageId] ?? String(t.languageId),
        value: t.value
      }))
    }

    return {
      statusCode: HttpStatus.OK,
      data: result,
      message: this.i18nService.translate(RewardMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      data,
      createdById
    }: {
      data: CreateRewardBodyInputType
      createdById: number
    },
    lang: string = 'vi'
  ) {
    let createdReward: any = null

    try {
      return await this.rewardRepo.withTransaction(async (prismaTx) => {
        const nameKey = `reward.name.${Date.now()}`

        // Convert data for create
        const dataCreate: CreateRewardBodyType = {
          nameKey,
          rewardType: data.rewardType,
          rewardItem: data.rewardItem,
          rewardTarget: data.rewardTarget
        }

        createdReward = await this.rewardRepo.create(
          {
            createdById,
            data: dataCreate
          },
          prismaTx
        )

        // Now we have id, create proper nameKey
        const fNameKey = `reward.name.${createdReward.id}`

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

        // Create translation records
        const translationRecords: CreateTranslationBodyType[] = []

        // nameTranslations → key = nameKey
        for (const item of data.nameTranslations) {
          translationRecords.push({
            languageId: langMap[item.key],
            key: fNameKey,
            value: item.value
          })
        }

        // Validate translations (check for duplicate names)
        await this.translationRepo.validateTranslationRecords(translationRecords)

        // Create or update translations with transaction
        // const translationPromises = translationRecords.map((record) =>
        //   this.translationRepo.createOrUpdateWithTransaction(record, prismaTx)
        // )
        // await Promise.all(translationPromises)

        // Update reward with final nameKey
        const result = await this.rewardRepo.update(
          {
            id: createdReward.id,
            data: {
              nameKey: fNameKey,
              nameTranslations: translationRecords,
              rewardNameKey: fNameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.CREATED,
          data: result,
          message: this.i18nService.translate(RewardMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete reward if created
      if (createdReward?.id) {
        try {
          await this.rewardRepo.delete(
            {
              id: createdReward.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new RewardAlreadyExistsException()
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
      data: UpdateRewardBodyInputType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingReward: any = null

    try {
      return await this.rewardRepo.withTransaction(async (prismaTx) => {
        let translationRecords: CreateTranslationBodyType[] = []
        // Get current record
        existingReward = await this.rewardRepo.findById(id)
        if (!existingReward) throw new NotFoundRecordException()

        // Prepare data for update
        const dataUpdate: Partial<UpdateRewardBodyType> = {}

        if (data.rewardType !== undefined) dataUpdate.rewardType = data.rewardType
        if (data.rewardItem !== undefined) dataUpdate.rewardItem = data.rewardItem
        if (data.rewardTarget !== undefined) dataUpdate.rewardTarget = data.rewardTarget

        // Handle translations if provided
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

            // Create translation records
            // const translationRecords: CreateTranslationBodyType[] = []

            // nameTranslations
            for (const t of data.nameTranslations) {
              translationRecords.push({
                languageId: langMap[t.key],
                key: existingReward.nameKey,
                value: t.value
              })
            }

            // Validate translation records
            await this.translationRepo.validateTranslationRecords(translationRecords)

            // Update translations with transaction
            // const translationPromises = translationRecords.map((record) =>
            //   this.translationRepo.createOrUpdateWithTransaction(record, prismaTx)
            // )
            // await Promise.all(translationPromises)
          }
        }

        // Update Reward main record
        const updatedReward = await this.rewardRepo.update(
          {
            id,
            updatedById,
            data: {
              ...dataUpdate,
              nameTranslations: data.nameTranslations ? translationRecords : [],
              rewardNameKey: existingReward.nameKey
            }
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedReward,
          message: this.i18nService.translate(RewardMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new RewardAlreadyExistsException()
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
      const existingReward = await this.rewardRepo.findDelId(id)
      if (!existingReward) {
        throw new NotFoundRecordException()
      }

      await Promise.all([
        this.rewardRepo.delete(
          {
            id,
            deletedById
          },
          existingReward.deletedAt ? true : false
        ),
        ...(existingReward.deletedAt
          ? [this.translationRepo.deleteByKey(existingReward.nameKey)]
          : [])
      ])

      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(RewardMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error))
        throw new InvalidForeignKeyConstraintException(
          (error.meta?.constraint as string) ?? ''
        )

      throw error
    }
  }

  /**
   *
   * Convert rewards to user benefits
   * Handles EXP, POKEMON, POKE_COINS, and SPARKLES reward types
   *
   * @param rewardIds - Array of reward IDs to process
   * @param userId - User ID to receive the rewards
   * @returns Object with processed results for each reward type
   */
  //todo Kumo
  async convertRewardsWithUser(
    rewardIds: number[],
    userId: number,
    sourceType: UserRewardSourceType
  ) {
    this.logger.log(`[convertRewardsWithUser] START - UserId: ${userId}, Initial RewardIds: [${rewardIds.join(', ')}], SourceType: ${sourceType}`)
    
    // Queue-based approach to handle level-up rewards without circular dependency
    const rewardQueue: number[] = [...rewardIds]
    const processedRewardIds = new Set<number>() // Track processed rewards to avoid duplicates

    // xem có tăng không
    const valueIncrease = await this.userSubService.getValueConvertByfeatureKeyAndUserId(
      FeatureKey.COIN_MULTIPLIER,
      userId
    )
    const valueIncreaseExp =
      await this.userSubService.getValueConvertByfeatureKeyAndUserId(
        FeatureKey.XP_MULTIPLIER,
        userId
      )

    const results: any = {
      pokeCoins: null,
      sparkles: null,
      pokemons: [],
      levelsGained: 0,
      levelRewards: [] // Track rewards from level-ups
    }

    const historyEntries: CreateUserRewardHistoryBodyType[] = []

    // Process rewards in queue until empty
    while (rewardQueue.length > 0) {
      const currentBatchIds = rewardQueue.splice(0, rewardQueue.length)
      this.logger.log(`[convertRewardsWithUser] Processing batch - RewardIds: [${currentBatchIds.join(', ')}]`)

      // Filter out already processed rewards
      const newRewardIds = currentBatchIds.filter((id) => !processedRewardIds.has(id))
      if (newRewardIds.length === 0) {
        this.logger.warn(`[convertRewardsWithUser] All rewards in batch already processed, skipping`)
        continue
      }
      
      this.logger.log(`[convertRewardsWithUser] New rewards to process: [${newRewardIds.join(', ')}], Already processed: [${Array.from(processedRewardIds).join(', ')}]`)

      // 1. Fetch all rewards by IDs using findManyByIds
      const rewards = await this.rewardRepo.findManyByIds(newRewardIds)
      
      this.logger.log(`[convertRewardsWithUser] Fetched ${rewards.length} rewards from DB for ${newRewardIds.length} requested IDs`)
      
      if (rewards.length !== newRewardIds.length) {
        const foundIds = rewards.map(r => r.id)
        const missingIds = newRewardIds.filter(id => !foundIds.includes(id))
        this.logger.error(`[convertRewardsWithUser] REWARD NOT FOUND - Requested: [${newRewardIds.join(', ')}], Found: [${foundIds.join(', ')}], Missing: [${missingIds.join(', ')}]`)
        throw new NotFoundRecordException()
      }
      
      this.logger.log(`[convertRewardsWithUser] Reward details: ${JSON.stringify(rewards.map(r => ({ id: r.id, target: r.rewardTarget, item: r.rewardItem })))}`)

      // Mark as processed
      newRewardIds.forEach((id) => processedRewardIds.add(id))

      // 2. Group rewards by target type
      const rewardsByType: Record<RewardTarget, typeof rewards> = {
        [RewardTarget.EXP]: [],
        [RewardTarget.POKEMON]: [],
        [RewardTarget.POKE_COINS]: [],
        [RewardTarget.SPARKLES]: []
      }

      for (const reward of rewards) {
        rewardsByType[reward.rewardTarget].push(reward)
      }

      // 3. Process EXP rewards (may trigger level-ups with more rewards)
      if (rewardsByType[RewardTarget.EXP].length > 0) {
        const totalExp = rewardsByType[RewardTarget.EXP].reduce(
          (sum, r) => sum + r.rewardItem,
          0
        )
        const expResult = await this.userService.userAddExp(
          userId,
          totalExp * valueIncreaseExp
        )

        // Accumulate level gains (don't store full user data)
        if (expResult.data.levelsGained) {
          results.levelsGained += expResult.data.levelsGained
        }

        // Add level-up rewards to queue if any
        if (expResult.data.levelRewardIds && expResult.data.levelRewardIds.length > 0) {
          this.logger.log(
            `[convertRewardsWithUser] User ${userId} leveled up ${expResult.data.levelsGained} times, levelRewardIds from userAddExp: [${expResult.data.levelRewardIds.join(', ')}]`
          )
          this.logger.log(
            `[convertRewardsWithUser] Level up details: ${JSON.stringify(expResult.data.levelUpDetails)}`
          )
          
          // Fetch level reward details to include in response
          this.logger.log(`[convertRewardsWithUser] Fetching level reward details for IDs: [${expResult.data.levelRewardIds.join(', ')}]`)
          const levelRewardDetails = await this.rewardRepo.findManyByIds(
            expResult.data.levelRewardIds
          )
          
          this.logger.log(`[convertRewardsWithUser] Level rewards fetched: ${levelRewardDetails.length} out of ${expResult.data.levelRewardIds.length}`)
          
          if (levelRewardDetails.length !== expResult.data.levelRewardIds.length) {
            const foundIds = levelRewardDetails.map(r => r.id)
            const missingIds = expResult.data.levelRewardIds.filter(id => !foundIds.includes(id))
            this.logger.error(`[convertRewardsWithUser] LEVEL REWARD NOT FOUND - Requested: [${expResult.data.levelRewardIds.join(', ')}], Found: [${foundIds.join(', ')}], Missing: [${missingIds.join(', ')}]`)
          }

          // Map rewards with level progression info
          const levelUpDetails = expResult.data.levelUpDetails || []
          levelRewardDetails.forEach((reward, index) => {
            const levelDetail = levelUpDetails[index]
            results.levelRewards.push({
              ...reward,
              fromLevel: levelDetail?.fromLevel,
              toLevel: levelDetail?.toLevel
            })
          })

          rewardQueue.push(...expResult.data.levelRewardIds)
          this.logger.log(`[convertRewardsWithUser] Added level rewards to queue. New queue: [${rewardQueue.join(', ')}]`)
        }

        this.userRewardHistoryService.appendEntriesFromRewards(
          historyEntries,
          rewardsByType[RewardTarget.EXP],
          userId,
          RewardTarget.EXP,
          sourceType
        )
      }

      // 4. Process POKE_COINS rewards
      if (rewardsByType[RewardTarget.POKE_COINS].length > 0) {
        const totalCoins = rewardsByType[RewardTarget.POKE_COINS].reduce(
          (sum, r) => sum + r.rewardItem,
          0
        )
        const coinsResult = await this.walletRepo.addBalanceToWalletWithType({
          userId,
          type: WalletType.POKE_COINS,
          amount: totalCoins * valueIncrease
        })

        // Accumulate or set result
        results.pokeCoins = coinsResult

        this.userRewardHistoryService.appendEntriesFromRewards(
          historyEntries,
          rewardsByType[RewardTarget.POKE_COINS],
          userId,
          RewardTarget.POKE_COINS,
          sourceType
        )
      }

      // 5. Process SPARKLES rewards
      if (rewardsByType[RewardTarget.SPARKLES].length > 0) {
        const totalSparkles = rewardsByType[RewardTarget.SPARKLES].reduce(
          (sum, r) => sum + r.rewardItem,
          0
        )

        const sparklesResult = await this.walletRepo.addBalanceToWalletWithType({
          userId,
          type: WalletType.SPARKLES,
          amount: totalSparkles * valueIncrease
        })

        // Accumulate or set result
        results.sparkles = sparklesResult

        this.userRewardHistoryService.appendEntriesFromRewards(
          historyEntries,
          rewardsByType[RewardTarget.SPARKLES],
          userId,
          RewardTarget.SPARKLES,
          sourceType
        )
      }

      // 6. Process POKEMON rewards (most complex)
      for (const pokemonReward of rewardsByType[RewardTarget.POKEMON]) {
        const pokemonId = pokemonReward.rewardItem

        // Check if user already has this pokemon
        const existingUserPokemon = await this.userPokemonRepo.findByUserAndPokemon(
          userId,
          pokemonId
        )

        if (!existingUserPokemon) {
          // User doesn't have this pokemon -> add it
          const newUserPokemon = await this.userPokemonRepo.create({
            userId,
            data: {
              pokemonId,
              isMain: false
            }
          })
          results.pokemons.push({
            action: 'added',
            pokemon: newUserPokemon
          })
          this.pushHistoryEntry(historyEntries, {
            userId,
            rewardId: pokemonReward.id,
            target: RewardTarget.POKEMON,
            amount: 1,
            meta: {
              pokemonId
            }
          })
        } else {
          // User already has this pokemon -> convert to coins based on rarity
          const pokemon = await this.pokemonRepo.findById(pokemonId)
          if (!pokemon) {
            throw new NotFoundRecordException()
          }

          // Calculate value: 200 * rarity_level * 0.5
          // Rarity levels: COMMON=1, UNCOMMON=2, RARE=3, EPIC=4, LEGENDARY=5
          const rarityLevels: Record<RarityPokemon, number> = {
            [RarityPokemon.COMMON]: 1,
            [RarityPokemon.UNCOMMON]: 2,
            [RarityPokemon.RARE]: 3,
            [RarityPokemon.EPIC]: 4,
            [RarityPokemon.LEGENDARY]: 5
          }

          const rarityLevel = rarityLevels[pokemon.rarity as RarityPokemon] || 1
          const coinValue = Math.floor(200 * rarityLevel * 0.5)

          // Add coins to user wallet
          const updatedWallet = await this.walletRepo.addBalanceToWalletWithType({
            userId,
            type: WalletType.SPARKLES,
            amount: coinValue * valueIncrease
          })

          results.pokemons.push({
            action: 'converted_to_coins',
            pokemon: pokemon,
            coinValue: coinValue * valueIncrease,
            wallet: updatedWallet
          })
          this.pushHistoryEntry(historyEntries, {
            userId,
            rewardId: pokemonReward.id,
            target: RewardTarget.SPARKLES,
            amount: coinValue * valueIncrease,
            note: `Converted pokemon ${pokemonId} reward to coins`,
            meta: {
              pokemonId,
              coinValue
            }
          })
        }
      }
    } // End of while loop

    this.logger.log(`[convertRewardsWithUser] COMPLETED - UserId: ${userId}, Total processed rewards: ${processedRewardIds.size}, Levels gained: ${results.levelsGained}, Level rewards: ${results.levelRewards.length}`)
    this.logger.log(`[convertRewardsWithUser] Final results: ${JSON.stringify({
      pokeCoinsUpdated: !!results.pokeCoins,
      sparklesUpdated: !!results.sparkles,
      pokemonsCount: results.pokemons.length,
      levelsGained: results.levelsGained,
      levelRewardsCount: results.levelRewards.length
    })}`)

    if (historyEntries.length > 0) {
      for (const entry of historyEntries) {
        try {
          await this.userRewardHistoryService.create(entry)
        } catch (error) {
          this.logger.warn(
            `Failed to record user reward history for user ${userId}: ${error?.message ?? error}`
          )
        }
      }
    }

    return results
  }

  async convertRewards(params: {
    rewardIds: number[]
    userId: number
    sourceType: UserRewardSourceType
    lang?: string
  }) {
    const data = await this.convertRewardsWithUser(
      params.rewardIds,
      params.userId,
      params.sourceType
    )
    return {
      statusCode: HttpStatus.OK,
      data,
      message: 'Convert rewards successfully'
    }
  }
}
