import { POKEMON_MESSAGE } from '@/common/constants/message'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable, Logger } from '@nestjs/common'
import { UploadService } from 'src/3rdService/upload/upload.service'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  PokemonAlreadyExistsException,
  PokemonNotFoundException
} from './dto/pokemon.error'
import {
  AssignPokemonTypesBodyType,
  CreatePokemonBodyType,
  UpdatePokemonBodyType
} from './entities/pokemon.entity'
import { PokemonRepo } from './pokemon.repo'

@Injectable()
export class PokemonService {
  private readonly logger = new Logger(PokemonService.name)

  constructor(
    private pokemonRepo: PokemonRepo,
    private uploadService: UploadService,
    private prismaService: PrismaService
  ) {}

  // Helper function to normalize form-data to standard format
  private normalizeCreateData(data: CreatePokemonBodyType): CreatePokemonBodyType {
    return {
      pokedex_number: data.pokedex_number,
      nameJp: data.nameJp,
      nameTranslations: data.nameTranslations,
      description: data.description ?? null,
      conditionLevel: data.conditionLevel ?? null,
      nextPokemonsId: data.nextPokemonsId ?? [],
      isStarted: data.isStarted,
      imageUrl: data.imageUrl ?? null,
      rarity: data.rarity,
      typeIds: data.typeIds
    }
  }

  // Helper function to normalize update data
  private normalizeUpdateData(data: UpdatePokemonBodyType): UpdatePokemonBodyType {
    return {
      ...data,
      description: data.description === undefined ? undefined : (data.description ?? null)
    }
  }

  async list(pagination: PaginationQueryType) {
    const data = await this.pokemonRepo.list(pagination)

    // Calculate weaknesses for each Pokemon in the list
    if (data.results && data.results.length > 0) {
      const pokemonWithWeaknesses = await Promise.all(
        data.results.map(async (pokemon: any) => {
          const weaknesses = await this.getWeaknessesForPokemon(pokemon.types)
          return {
            ...pokemon,
            weaknesses
          }
        })
      )

      data.results = pokemonWithWeaknesses
    }

    return {
      statusCode: 200,
      data,
      message: POKEMON_MESSAGE.GET_LIST_SUCCESS
    }
  }

  async findById(id: number) {
    const pokemon = await this.pokemonRepo.findById(id)
    if (!pokemon) {
      throw PokemonNotFoundException
    }

    // Calculate weaknesses for this Pokemon
    const weaknesses = await this.getWeaknessesForPokemon(pokemon.types)

    return {
      statusCode: 200,
      data: {
        ...pokemon,
        weaknesses
      },
      message: POKEMON_MESSAGE.GET_DETAIL_SUCCESS
    }
  }

  async create({
    data,
    createdById
  }: {
    data: CreatePokemonBodyType
    createdById: number
  }) {
    try {
      // Normalize data to standard format
      let pokemonData = this.normalizeCreateData(data)

      // Check if Pokemon with same pokedex number exists
      const existingPokemon = await this.pokemonRepo.findByPokedexNumber(
        pokemonData.pokedex_number
      )
      if (existingPokemon) {
        throw PokemonAlreadyExistsException
      }

      // Create Pokemon first
      const result = await this.pokemonRepo.create({
        createdById,
        data: pokemonData
      })

      // If has nextPokemons, update each next Pokemon's previousPokemons relation
      if (pokemonData.nextPokemonsId && pokemonData.nextPokemonsId.length > 0) {
        for (const nextPokemonId of pokemonData.nextPokemonsId) {
          await this.pokemonRepo.addToPreviousPokemons(nextPokemonId, result.id)
        }
      }

      return {
        statusCode: 201,
        data: result,
        message: POKEMON_MESSAGE.CREATE_SUCCESS
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw PokemonAlreadyExistsException
      }
      if (isNotFoundPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async update({
    id,
    data,
    updatedById
  }: {
    id: number
    data: UpdatePokemonBodyType
    updatedById: number
  }) {
    try {
      // Normalize data
      let pokemonData = this.normalizeUpdateData(data)

      const existPokemon = await this.pokemonRepo.findById(id)
      if (!existPokemon) {
        throw PokemonNotFoundException
      }

      // Handle image URL change
      if (pokemonData.imageUrl && pokemonData.imageUrl !== existPokemon.imageUrl) {
        // Delete old image from Cloudinary if exists
        if (existPokemon.imageUrl) {
          try {
            await this.uploadService.deleteFile(existPokemon.imageUrl, 'pokemon/images')
            this.logger.log(`Deleted old Pokemon image: ${existPokemon.imageUrl}`)
          } catch (error) {
            // Log warning but don't fail the update
            this.logger.warn(`Failed to delete old Pokemon image: ${error.message}`)
          }
        }
      }

      // Check if updating pokedex number to existing one
      if (pokemonData.pokedex_number) {
        const existingWithPokedex = await this.pokemonRepo.findByPokedexNumber(
          pokemonData.pokedex_number
        )
        if (existingWithPokedex && existingWithPokedex.id !== id) {
          throw PokemonAlreadyExistsException
        }
      }

      // Handle evolution relation changes
      const oldNextPokemonIds = existPokemon.nextPokemons?.map((p) => p.id) || []
      const newNextPokemonIds =
        pokemonData.nextPokemonsId !== undefined
          ? pokemonData.nextPokemonsId
          : oldNextPokemonIds // Keep old value if not provided in update

      // Find IDs to remove and add
      const toRemove = oldNextPokemonIds.filter((id) => !newNextPokemonIds.includes(id))
      const toAdd = newNextPokemonIds.filter((id) => !oldNextPokemonIds.includes(id))

      // Remove from old next Pokemons' previousPokemons
      for (const nextPokemonId of toRemove) {
        try {
          await this.pokemonRepo.removeFromPreviousPokemons(nextPokemonId, id)
        } catch (error) {
          console.warn('Failed to remove from old next Pokemon previousPokemons:', error)
        }
      }

      // Add to new next Pokemons' previousPokemons
      for (const nextPokemonId of toAdd) {
        try {
          await this.pokemonRepo.addToPreviousPokemons(nextPokemonId, id)
        } catch (error) {
          console.warn('Failed to add to new next Pokemon previousPokemons:', error)
        }
      }

      const pokemon = await this.pokemonRepo.update({
        id,
        updatedById,
        data: pokemonData
      })
      return {
        statusCode: 200,
        data: pokemon,
        message: POKEMON_MESSAGE.UPDATE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw PokemonNotFoundException
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw PokemonAlreadyExistsException
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async delete({ id, deletedById }: { id: number; deletedById: number }) {
    try {
      const existPokemon = await this.pokemonRepo.findById(id)
      if (!existPokemon) {
        throw PokemonNotFoundException
      }

      // Remove from next Pokemons' previousPokemons if this Pokemon has evolutions
      if (existPokemon.nextPokemons && existPokemon.nextPokemons.length > 0) {
        for (const nextPokemon of existPokemon.nextPokemons) {
          try {
            await this.pokemonRepo.removeFromPreviousPokemons(nextPokemon.id, id)
          } catch (error) {
            console.warn(
              'Failed to remove from next Pokemon previousPokemons on delete:',
              error
            )
          }
        }
      }

      await this.pokemonRepo.delete({
        id,
        deletedById
      })
      return {
        statusCode: 200,
        data: null,
        message: POKEMON_MESSAGE.DELETE_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw PokemonNotFoundException
      }
      throw error
    }
  }

  async assignTypes(id: number, data: AssignPokemonTypesBodyType) {
    try {
      const existPokemon = await this.pokemonRepo.findById(id)
      if (!existPokemon) {
        throw PokemonNotFoundException
      }

      await this.pokemonRepo.assignTypes(id, data)
      return {
        statusCode: 200,
        data: null,
        message: POKEMON_MESSAGE.ASSIGN_TYPES_SUCCESS
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw PokemonNotFoundException
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw NotFoundRecordException
      }
      throw error
    }
  }

  async getStarterPokemons() {
    const data = await this.pokemonRepo.getStarterPokemons()

    // Calculate weaknesses for each starter Pokemon
    if (data && data.length > 0) {
      const pokemonWithWeaknesses = await Promise.all(
        data.map(async (pokemon: any) => {
          const weaknesses = await this.getWeaknessesForPokemon(pokemon.types)
          return {
            ...pokemon,
            weaknesses
          }
        })
      )

      return {
        statusCode: 200,
        data: pokemonWithWeaknesses,
        message: 'Lấy danh sách Pokemon khởi đầu thành công'
      }
    }

    return {
      statusCode: 200,
      data,
      message: 'Lấy danh sách Pokemon khởi đầu thành công'
    }
  }

  async getPokemonsByRarity(rarity: string) {
    const data = await this.pokemonRepo.getPokemonsByRarity(rarity)

    // Calculate weaknesses for each Pokemon by rarity
    if (data && data.length > 0) {
      const pokemonWithWeaknesses = await Promise.all(
        data.map(async (pokemon: any) => {
          const weaknesses = await this.getWeaknessesForPokemon(pokemon.types)
          return {
            ...pokemon,
            weaknesses
          }
        })
      )

      return {
        statusCode: 200,
        data: pokemonWithWeaknesses,
        message: `Lấy danh sách Pokemon ${rarity} thành công`
      }
    }

    return {
      statusCode: 200,
      data,
      message: `Lấy danh sách Pokemon ${rarity} thành công`
    }
  }

  async getPokemonsByType(typeName: string) {
    const data = await this.pokemonRepo.getPokemonsByType(typeName)

    // Calculate weaknesses for each Pokemon by type
    if (data && data.length > 0) {
      const pokemonWithWeaknesses = await Promise.all(
        data.map(async (pokemon: any) => {
          const weaknesses = await this.getWeaknessesForPokemon(pokemon.types)
          return {
            ...pokemon,
            weaknesses
          }
        })
      )

      return {
        statusCode: 200,
        data: pokemonWithWeaknesses,
        message: `Lấy danh sách Pokemon hệ ${typeName} thành công`
      }
    }

    return {
      statusCode: 200,
      data,
      message: `Lấy danh sách Pokemon hệ ${typeName} thành công`
    }
  }

  // Calculate Pokemon weaknesses based on its types
  async calculatePokemonWeaknesses(pokemonId: number) {
    // Get Pokemon with its types
    const pokemon = await this.pokemonRepo.findById(pokemonId)
    if (!pokemon) {
      throw PokemonNotFoundException
    }

    if (!pokemon.types || pokemon.types.length === 0) {
      return {
        statusCode: 200,
        data: {
          pokemon: {
            id: pokemon.id,
            nameJp: pokemon.nameJp,
            nameTranslations: pokemon.nameTranslations
          },
          weaknesses: []
        },
        message: 'Pokemon không có hệ nào'
      }
    }

    // Get all type effectiveness where Pokemon's types are defenders
    const typeIds = pokemon.types.map((type) => type.id)

    // Get all attacking types and their effectiveness against Pokemon's types
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
        },
        defender: {
          select: {
            id: true,
            type_name: true,
            display_name: true,
            color_hex: true
          }
        }
      }
    })

    // Calculate combined effectiveness for each attacking type
    const weaknessMap = new Map<
      number,
      {
        type: any
        multiplier: number
      }
    >()

    // Group by attacker type
    const attackerGroups = new Map<number, any[]>()
    for (const effectiveness of typeEffectiveness) {
      const attackerId = effectiveness.attackerId
      if (!attackerGroups.has(attackerId)) {
        attackerGroups.set(attackerId, [])
      }
      attackerGroups.get(attackerId)!.push(effectiveness)
    }

    // Calculate final multiplier for each attacking type
    for (const [attackerId, effectivenesses] of attackerGroups) {
      let finalMultiplier = 1
      const attackerType = effectivenesses[0].attacker

      // Multiply effectiveness against each defending type
      for (const effectiveness of effectivenesses) {
        finalMultiplier *= effectiveness.multiplier
      }

      // Only include if it's a weakness (multiplier > 1)
      if (finalMultiplier > 1) {
        weaknessMap.set(attackerId, {
          type: attackerType,
          multiplier: finalMultiplier
        })
      }
    }

    // Convert to array and sort by multiplier (highest first)
    const weaknesses = Array.from(weaknessMap.values()).sort(
      (a, b) => b.multiplier - a.multiplier
    )

    return {
      statusCode: 200,
      data: {
        pokemon: {
          id: pokemon.id,
          nameJp: pokemon.nameJp,
          nameTranslations: pokemon.nameTranslations,
          types: pokemon.types
        },
        weaknesses: weaknesses.map((w) => ({
          ...w.type,
          effectiveness_multiplier: w.multiplier
        }))
      },
      message: 'Lấy điểm yếu Pokemon thành công'
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (for internal use)
  async getWeaknessesForPokemon(pokemonTypes: any[]) {
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

  /**
   * Get available evolution options for a Pokemon
   */
  async getEvolutionOptions(pokemonId: number) {
    try {
      const pokemon = await this.pokemonRepo.findById(pokemonId)
      if (!pokemon) {
        throw PokemonNotFoundException
      }

      // Get evolution options (nextPokemons)
      const evolutionOptions = pokemon.nextPokemons || []

      return {
        statusCode: 200,
        data: evolutionOptions,
        message: 'Lấy danh sách tiến hóa thành công'
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw PokemonNotFoundException
      }
      throw error
    }
  }
}
