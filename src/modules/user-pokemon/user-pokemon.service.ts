import { I18nService } from '@/i18n/i18n.service'
import { UserPokemonMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { LevelRepo } from '../level/level.repo'
import { PokemonRepo } from '../pokemon/pokemon.repo'
import {
  ErrorInitLevelPokemonException,
  InvalidUserAccessPokemonException,
  NicknameAlreadyExistsException,
  UserHasPokemonException,
  UserPokemonNotFoundException
} from './dto/user-pokemon.error'
import {
  CreateUserPokemonBodyType,
  UpdateUserPokemonBodyType
} from './entities/user-pokemon.entity'
import { UserPokemonRepo } from './user-pokemon.repo'

@Injectable()
export class UserPokemonService {
  constructor(
    private userPokemonRepo: UserPokemonRepo,
    private pokemonRepo: PokemonRepo,
    private levelRepo: LevelRepo,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly i18nService: I18nService,
    private prismaService: PrismaService
  ) {}

  async list(pagination: PaginationQueryType, userId: number, lang: string = 'vi') {
    const data = await this.userPokemonRepo.list(pagination, userId)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Add Pokemon for user via Shop purchase (nickname = null, isMain = false, level = conditionLevel if has prev, else first level)
  async addPokemonByShop(
    { userId, pokemonId }: { userId: number; pokemonId: number },
    prismaTx?: PrismaClient
  ) {
    // 1) Check if user already owns this Pokemon
    const existing = await this.userPokemonRepo.findByUserAndPokemon(userId, pokemonId)
    if (existing) {
      throw new UserHasPokemonException()
    }

    // 2) Lấy thông tin pokemon
    const [pokemon] = await Promise.all([this.pokemonRepo.findById(pokemonId)])

    if (!pokemon) {
      throw new NotFoundRecordException()
    }

    // 5) Tạo pokemon mới cho user
    const created = await this.userPokemonRepo.create(
      {
        userId,
        data: {
          pokemonId,
          nickname: null,
          isMain: false
        }
      },
      prismaTx
    )

    return created
  }

  async addPokemonByGacha(
    { userId, data }: { userId: number; data: CreateUserPokemonBodyType },
    prismaTx?: PrismaClient
  ) {
    try {
      // Get Pokemon info to use nameJp as nickname if not provided
      const pokemon = await this.pokemonRepo.findById(data.pokemonId)
      if (!pokemon) {
        throw new NotFoundRecordException()
      }

      // Get user check is first pokemon
      const user = await this.sharedUserRepository.findUnique({ id: userId })

      // Check if user already has this Pokemon
      const existingUserPokemon = await this.userPokemonRepo.findByUserAndPokemon(
        userId,
        data.pokemonId
      )
      if (existingUserPokemon) {
        throw new UserHasPokemonException()
      }

      const created = await this.userPokemonRepo.create(
        {
          userId,
          data: {
            pokemonId: data.pokemonId,
            nickname: null,
            isMain: false
          }
        },
        prismaTx
      )
      return {
        data: created
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new NicknameAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async getUserPokemonStats(userId: number, lang: string = 'vi') {
    const userPokemons = await this.userPokemonRepo.getByUserId(userId)
    const totalPokemons = await this.prismaService.pokemon.count()
    const userPokemonsCount = userPokemons.length
    const ownershipPercentage =
      totalPokemons > 0 ? Math.round((userPokemonsCount / totalPokemons) * 100) : 0
    return {
      statusCode: 200,
      data: {
        ownershipPercentage,
        userPokemonsCount,
        totalPokemons
      },
      message: this.i18nService.translate(UserPokemonMessage.GET_STATS_SUCCESS, lang)
    }
  }

  async getPokemonListWithUser(
    query: PaginationQueryType,
    userId: number,
    lang: string = 'vi',
    hasPokemon: string | undefined = undefined
  ) {
    console.log('ser - hasPokemon: ', hasPokemon)
    const filterHasPoke =
      hasPokemon === 'true' ? true : hasPokemon === 'false' ? false : undefined

    // 1. Lấy danh sách tất cả pokemon
    const pokemonData = await this.pokemonRepo.getPokemonListWithPokemonUser(query)

    // 2. Lấy danh sách pokemon của user
    const userPokemons = await this.userPokemonRepo.getByUserId(userId)
    const userPokemonIds = new Set(userPokemons.map((up) => up.pokemonId))

    // 4. Optimize: Calculate weaknesses for all Pokemon in batch
    if (pokemonData.results && pokemonData.results.length > 0) {
      // Get all unique type IDs from all Pokemon
      const allTypeIds = new Set<number>()
      pokemonData.results.forEach((pokemon: any) => {
        pokemon.types?.forEach((type: any) => {
          allTypeIds.add(type.id)
        })
      })

      // Calculate weaknesses for each Pokemon and mark if user owns it
      const pokemonWithUserInfo = pokemonData.results.map((pokemon: any) => {
        const allWeaknesses = new Map<number, any>()

        return {
          ...pokemon,
          weaknesses: Array.from(allWeaknesses.values()),
          userPokemon: userPokemonIds.has(pokemon.id)
        }
      })

      pokemonData.results = pokemonWithUserInfo

      if (filterHasPoke !== undefined) {
        pokemonData.results = pokemonWithUserInfo.filter((pokemon: any) => {
          return pokemon.userPokemon === filterHasPoke
        })
      }
    }

    return {
      statusCode: 200,
      data: pokemonData,
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async listWithUserId(userId: number, lang: string = 'vi') {
    const data = await this.userPokemonRepo.getByUserId(userId)

    // Optimize: Calculate weaknesses for all Pokemon in batch
    if (data && data.length > 0) {
      // Get all unique type IDs from all Pokemon
      const allTypeIds = new Set<number>()
      data.forEach((userPokemon: any) => {
        userPokemon.pokemon?.types?.forEach((type: any) => {
          allTypeIds.add(type.id)
        })
      })

      // Batch load all type effectiveness data once
      const allTypeEffectiveness = await this.prismaService.typeEffectiveness.findMany({
        where: {
          defenderId: {
            in: Array.from(allTypeIds)
          },
          multiplier: {
            gt: 1 // Only get super effective (weaknesses)
          }
        },
        include: {
          attacker: {
            select: {
              id: true,
              type_name: true,
              display_name: true,
              color_hex: true
            }
          }
        }
      })

      // Create lookup map for faster access
      const effectivenessMap = new Map<number, any[]>()
      allTypeEffectiveness.forEach((eff) => {
        if (!effectivenessMap.has(eff.defenderId)) {
          effectivenessMap.set(eff.defenderId, [])
        }
        effectivenessMap.get(eff.defenderId)!.push({
          ...eff.attacker,
          effectiveness_multiplier: eff.multiplier
        })
      })

      // Calculate weaknesses for each Pokemon using cached data
      const userPokemonsWithWeaknesses = data.map((userPokemon: any) => {
        if (!userPokemon.pokemon?.types) {
          return userPokemon
        }

        const allWeaknesses = new Map<number, any>()

        userPokemon.pokemon.types.forEach((type: any) => {
          const weaknesses = effectivenessMap.get(type.id) || []
          weaknesses.forEach((weakness) => {
            if (
              !allWeaknesses.has(weakness.id) ||
              allWeaknesses.get(weakness.id).effectiveness_multiplier <
                weakness.effectiveness_multiplier
            ) {
              allWeaknesses.set(weakness.id, weakness)
            }
          })
        })

        return {
          ...userPokemon,
          pokemon: {
            ...userPokemon.pokemon,
            weaknesses: Array.from(allWeaknesses.values())
          }
        }
      })

      return {
        statusCode: 200,
        data: userPokemonsWithWeaknesses,
        message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang)
      }
    }

    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(UserPokemonMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  private async getWeaknessesForPokemon(pokemonTypes: any[] | undefined) {
    if (!pokemonTypes || pokemonTypes.length === 0) {
      return []
    }

    const typeIds = pokemonTypes.map((type) => type.id)

    const typeEffectiveness = await this.prismaService.typeEffectiveness.findMany({
      where: {
        defenderId: {
          in: typeIds
        },
        deletedAt: null
      },
      include: {
        attacker: {
          select: {
            id: true,
            type_name: true,
            display_name: true,
            color_hex: true
          }
        }
      }
    })

    const weaknessMap = new Map<
      number,
      {
        type: any
        multiplier: number
      }
    >()

    const attackerGroups = new Map<number, any[]>()
    for (const effectiveness of typeEffectiveness) {
      const attackerId = effectiveness.attackerId
      if (!attackerGroups.has(attackerId)) {
        attackerGroups.set(attackerId, [])
      }
      attackerGroups.get(attackerId)!.push(effectiveness)
    }

    for (const [attackerId, effectivenesses] of attackerGroups) {
      let finalMultiplier = 1
      const attackerType = effectivenesses[0].attacker

      for (const effectiveness of effectivenesses) {
        finalMultiplier *= effectiveness.multiplier
      }

      if (finalMultiplier > 1) {
        weaknessMap.set(attackerId, {
          type: attackerType,
          multiplier: finalMultiplier
        })
      }
    }

    return Array.from(weaknessMap.values())
      .sort((a, b) => b.multiplier - a.multiplier)
      .map((w) => ({
        ...w.type,
        effectiveness_multiplier: w.multiplier
      }))
  }

  async findById(id: number, lang: string = 'vi') {
    const userPokemon = await this.userPokemonRepo.findById(id)
    if (!userPokemon) {
      throw new UserPokemonNotFoundException()
    }

    // Calculate weaknesses for the Pokemon
    let weaknesses: any[] = []
    if (userPokemon.pokemon?.types) {
      weaknesses = await this.getWeaknessesForPokemon(userPokemon.pokemon.types)
    }

    // Process nextPokemons with their weaknesses, nextPokemons,
    const nextPokemonsWithDetails = await Promise.all(
      (userPokemon.pokemon?.nextPokemons || []).map(async (nextPokemon: any) => {
        const nextWeaknesses = await this.getWeaknessesForPokemon(nextPokemon.types)

        // Get level info for this pokemon if user owns it
        let userLevel: any = null
        const userOwnedPokemon = await this.userPokemonRepo.findByUserAndPokemon(
          userPokemon.userId,
          nextPokemon.id
        )

        // Process nested nextPokemons
        const nestedNextPokemons = await Promise.all(
          (nextPokemon.nextPokemons || []).map(async (nestedNext: any) => {
            const nestedWeaknesses = await this.getWeaknessesForPokemon(nestedNext.types)
            return {
              ...nestedNext,
              weaknesses: nestedWeaknesses
            }
          })
        )

        return {
          ...nextPokemon,
          weaknesses: nextWeaknesses,
          nextPokemons: nestedNextPokemons
        }
      })
    )

    // Calculate weaknesses for each previousPokemon
    const previousPokemonsWithWeaknesses = await Promise.all(
      (userPokemon.pokemon?.previousPokemons || []).map(async (prevPokemon: any) => {
        const prevWeaknesses = await this.getWeaknessesForPokemon(prevPokemon.types)
        return {
          ...prevPokemon,
          weaknesses: prevWeaknesses
        }
      })
    )

    const enrichedUserPokemon = {
      ...userPokemon,
      pokemon: userPokemon.pokemon
        ? {
            ...userPokemon.pokemon,
            weaknesses,
            nextPokemons: nextPokemonsWithDetails,
            previousPokemons: previousPokemonsWithWeaknesses
          }
        : userPokemon.pokemon
    }

    return {
      statusCode: 200,
      data: enrichedUserPokemon,
      message: this.i18nService.translate(UserPokemonMessage.GET_DETAIL_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateUserPokemonBodyType },
    lang: string = 'vi'
  ) {
    try {
      // Get Pokemon info to use nameJp as nickname if not provided
      const pokemon = await this.pokemonRepo.findById(data.pokemonId)
      if (!pokemon) {
        throw new NotFoundRecordException()
      }

      // If no nickname provided, use Pokemon's nameJp
      let nickname = data.nickname
      if (!nickname) {
        nickname = pokemon.nameJp
      }

      // Get user check is first pokemon
      const user = await this.sharedUserRepository.findUnique({ id: userId })
      let isFirstPokemon = false

      if (user?.levelId === null) {
        const firstLevelUser = await this.levelRepo.getFirstLevelUser()
        if (!firstLevelUser) {
          throw new ErrorInitLevelPokemonException()
        }
        await this.sharedUserRepository.addLevelForUser(userId, firstLevelUser.id)
        isFirstPokemon = true
      }

      // Check if user already has this Pokemon
      const existingUserPokemon = await this.userPokemonRepo.findByUserAndPokemon(
        userId,
        data.pokemonId
      )
      if (existingUserPokemon) {
        throw new UserHasPokemonException()
      }

      // Check if nickname is already used by this user
      if (nickname) {
        const existingNickname = await this.userPokemonRepo.findByUserAndNickname(
          userId,
          nickname
        )
        if (existingNickname) {
          throw new NicknameAlreadyExistsException()
        }
      }

      const result = await this.userPokemonRepo.create({
        userId,
        data: {
          ...data,
          nickname,
          isMain: isFirstPokemon // Set isMain = true nếu là Pokemon đầu tiên
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(UserPokemonMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new NicknameAlreadyExistsException()
      }
      if (isNotFoundPrismaError(error)) {
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
      data: UpdateUserPokemonBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const existUserPokemon = await this.userPokemonRepo.findById(id)
      if (!existUserPokemon) {
        throw new UserPokemonNotFoundException()
      }

      // Check if user owns this Pokemon (optional security check)
      if (userId && existUserPokemon.userId !== userId) {
        throw new InvalidUserAccessPokemonException()
      }

      // Check if nickname is already used by this user
      if (data.nickname) {
        const existingNickname = await this.userPokemonRepo.findByUserAndNickname(
          existUserPokemon.userId,
          data.nickname
        )
        if (existingNickname && existingNickname.id !== id) {
          throw new NicknameAlreadyExistsException()
        }
      }

      // Check if isMain is set to true
      if (data.isMain === true) {
        // Unset isMain for all other user's pokemon
        await this.userPokemonRepo.unsetMainPokemon(existUserPokemon.userId)
      }

      const { exp, ...updateData } = data
      const userPokemon = await this.userPokemonRepo.update({
        id,
        data: updateData
      })
      return {
        statusCode: 200,
        data: userPokemon,
        message: this.i18nService.translate(UserPokemonMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserPokemonNotFoundException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new NicknameAlreadyExistsException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existUserPokemon = await this.userPokemonRepo.findById(id)
      if (!existUserPokemon) {
        throw new UserPokemonNotFoundException()
      }

      // Check if user owns this Pokemon (optional security check)
      if (userId && existUserPokemon.userId !== userId) {
        throw new InvalidUserAccessPokemonException()
      }

      await this.userPokemonRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(UserPokemonMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new UserPokemonNotFoundException()
      }
      throw error
    }
  }

  async getUserPokemons(userId: number) {
    const data = await this.userPokemonRepo.getUserPokemons(userId)
    return {
      statusCode: 200,
      data,
      message: 'Lấy danh sách Pokemon của người dùng thành công'
    }
  }

  async getWithEvolvesPokemon(pokemonId: number, userId: number, lang: string = 'vi') {
    // 1. Lấy userPokemon với pokemon, level và evolution chain
    const userPokemon = await this.userPokemonRepo.findByPokemonId(pokemonId, userId)

    if (!userPokemon) {
      throw new UserPokemonNotFoundException()
    }

    const weaknesses = await this.getWeaknessesForPokemon(userPokemon.pokemon?.types)
    console.log('userId: ', userId)

    console.log('userpokemon.userId: ', userPokemon.userId)

    // 2. Verify ownership
    if (userPokemon.userId !== userId) {
      throw new InvalidUserAccessPokemonException()
    }

    // 3. Lấy tất cả pokemon IDs cần check ownership (previous + next)
    const pokemonIdsToCheck: number[] = []

    if (userPokemon.pokemon?.previousPokemons) {
      pokemonIdsToCheck.push(
        ...userPokemon.pokemon.previousPokemons.map((p: any) => p.id)
      )
    }

    if (userPokemon.pokemon?.nextPokemons) {
      pokemonIdsToCheck.push(...userPokemon.pokemon.nextPokemons.map((p: any) => p.id))
    }

    // 4. Lấy tất cả userPokemon của user có pokemonId trong list
    const userOwnedPokemons = await Promise.all(
      pokemonIdsToCheck.map((pokemonId) =>
        this.userPokemonRepo.findByUserAndPokemon(userId, pokemonId)
      )
    )

    // 5. Tạo map để lookup nhanh
    const ownedPokemonMap = new Map<number, any>()
    userOwnedPokemons.forEach((up) => {
      if (up) {
        ownedPokemonMap.set(up.pokemonId, up)
      }
    })

    // 6. Map previousPokemons với userPokemon
    const previousPokemonsWithOwnership =
      userPokemon.pokemon?.previousPokemons?.map((prevPokemon: any) => ({
        ...prevPokemon,
        userPokemon: ownedPokemonMap.has(prevPokemon.id) || false
      })) || []

    // 7. Map nextPokemons với userPokemon
    const nextPokemonsWithOwnership =
      userPokemon.pokemon?.nextPokemons?.map((nextPokemon: any) => ({
        ...nextPokemon,
        userPokemon: ownedPokemonMap.has(nextPokemon.id) || false
      })) || []

    // 8. Construct response
    const result = {
      ...userPokemon,
      pokemon: {
        ...userPokemon.pokemon,
        weaknesses,
        previousPokemons: previousPokemonsWithOwnership,
        nextPokemons: nextPokemonsWithOwnership
      }
    }
    // chinh lai gan userPokemon  = true hoac false

    return {
      statusCode: 200,
      data: result,
      message: this.i18nService.translate(UserPokemonMessage.GET_DETAIL_SUCCESS, lang)
    }
  }
}
