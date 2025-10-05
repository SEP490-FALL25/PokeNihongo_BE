import { FolderName } from '@/common/constants/media.constant'
import { POKEMON_MESSAGE } from '@/common/constants/message'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { UploadService } from 'src/3rdService/upload/upload.service'
import {
  PokemonAlreadyExistsException,
  PokemonNotFoundException
} from './dto/pokemon.error'
import {
  AssignPokemonTypesBodyType,
  CreatePokemonBodyType,
  CreatePokemonFormDataType,
  UpdatePokemonBodyType,
  UpdatePokemonFormDataType
} from './entities/pokemon.entity'
import { PokemonRepo } from './pokemon.repo'

@Injectable()
export class PokemonService {
  constructor(
    private pokemonRepo: PokemonRepo,
    private uploadService: UploadService
  ) {}

  // Helper function to normalize form-data to standard format
  private normalizeCreateData(
    data: CreatePokemonBodyType | CreatePokemonFormDataType
  ): CreatePokemonBodyType {
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
  private normalizeUpdateData(
    data: UpdatePokemonBodyType | UpdatePokemonFormDataType
  ): UpdatePokemonBodyType {
    return {
      ...data,
      description: data.description === undefined ? undefined : (data.description ?? null)
    }
  }

  async list(pagination: PaginationQueryType) {
    const data = await this.pokemonRepo.list(pagination)
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
    return {
      statusCode: 200,
      data: pokemon,
      message: POKEMON_MESSAGE.GET_DETAIL_SUCCESS
    }
  }

  async create({
    data,
    createdById,
    imageFile
  }: {
    data: CreatePokemonBodyType | CreatePokemonFormDataType
    createdById: number
    imageFile?: Express.Multer.File
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

      // Upload image if provided
      if (imageFile) {
        const uploadResult = await this.uploadService.uploadFileByType(
          imageFile,
          FolderName.POKEMON
        )
        pokemonData.imageUrl = uploadResult.url
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
    updatedById,
    imageFile
  }: {
    id: number
    data: UpdatePokemonBodyType | UpdatePokemonFormDataType
    updatedById: number
    imageFile?: Express.Multer.File
  }) {
    try {
      // Normalize data
      let pokemonData = this.normalizeUpdateData(data)

      const existPokemon = await this.pokemonRepo.findById(id)
      if (!existPokemon) {
        throw PokemonNotFoundException
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

      // Upload new image if provided
      if (imageFile) {
        const uploadResult = await this.uploadService.uploadFileByType(
          imageFile,
          FolderName.POKEMON
        )
        pokemonData.imageUrl = uploadResult.url

        // Delete old image if exists
        if (existPokemon.imageUrl) {
          try {
            await this.uploadService.deleteFile(existPokemon.imageUrl, FolderName.POKEMON)
          } catch (error) {
            // Log warning but don't fail the update
            console.warn('Failed to delete old Pokemon image:', error)
          }
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
    return {
      statusCode: 200,
      data,
      message: 'Lấy danh sách Pokemon khởi đầu thành công'
    }
  }

  async getPokemonsByRarity(rarity: string) {
    const data = await this.pokemonRepo.getPokemonsByRarity(rarity)
    return {
      statusCode: 200,
      data,
      message: `Lấy danh sách Pokemon ${rarity} thành công`
    }
  }
}
