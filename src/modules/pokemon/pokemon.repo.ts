import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  AssignPokemonTypesBodyType,
  CreatePokemonBodyType,
  POKEMON_FIELDS,
  PokemonType,
  UpdatePokemonBodyType
} from './entities/pokemon.entity'

type PokemonWithRelations = PokemonType & {
  types?: Array<{
    id: number
    type_name: string
    display_name: any
    color_hex: string
  }>
  nextPokemon?: PokemonType | null
  previousPokemons?: PokemonType[]
}

@Injectable()
export class PokemonRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreatePokemonBodyType
  }): Promise<any> {
    const { typeIds, ...pokemonData } = data
    return this.prismaService.pokemon.create({
      data: {
        ...pokemonData,
        nameTranslations: pokemonData.nameTranslations ?? {},
        createdById,
        // Connect elemental types
        types: {
          connect: typeIds.map((id) => ({ id }))
        }
      },
      include: {
        types: true,
        nextPokemon: true,
        previousPokemons: true,
        createdBy: {
          select: { id: true, name: true }
        },
        updatedBy: {
          select: { id: true, name: true }
        }
      }
    })
  }

  update({
    id,
    updatedById,
    data
  }: {
    id: number
    updatedById: number
    data: UpdatePokemonBodyType
  }): Promise<any> {
    const { typeIds, ...pokemonData } = data
    return this.prismaService.pokemon.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...pokemonData,
        updatedById,
        // Update elemental types nếu có
        ...(typeIds && {
          types: {
            set: [], // Clear existing connections
            connect: typeIds.map((id) => ({ id })) // Connect new types
          }
        })
      },
      include: {
        types: true,
        nextPokemon: true,
        previousPokemons: true,
        createdBy: {
          select: { id: true, name: true }
        },
        updatedBy: {
          select: { id: true, name: true }
        }
      }
    })
  }

  delete(
    {
      id,
      deletedById
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean
  ): Promise<any> {
    return isHard
      ? this.prismaService.pokemon.delete({
          where: {
            id
          }
        })
      : this.prismaService.pokemon.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date(),
            deletedById
          }
        })
  }

  async list(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(pagination.qs, POKEMON_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.pokemon.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.pokemon.findMany({
        where: { deletedAt: null, ...where },
        include: {
          types: {
            select: {
              id: true,
              type_name: true,
              display_name: true,
              color_hex: true
            }
          },
          nextPokemon: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              imageUrl: true,
              rarity: true
            }
          },
          previousPokemons: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              imageUrl: true,
              rarity: true
            },
            where: {
              deletedAt: null
            }
          }
        },
        orderBy,
        skip,
        take
      })
    ])

    return {
      results: data,
      pagination: {
        current: pagination.currentPage,
        pageSize: pagination.pageSize,
        totalPage: Math.ceil(totalItems / pagination.pageSize),
        totalItem: totalItems
      }
    }
  }

  findById(id: number): Promise<any> {
    return this.prismaService.pokemon.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        types: {
          select: {
            id: true,
            type_name: true,
            display_name: true,
            color_hex: true
          }
        },
        nextPokemon: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            description: true,
            conditionLevel: true,
            isStarted: true,
            imageUrl: true,
            rarity: true
          }
        },
        previousPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            description: true,
            conditionLevel: true,
            isStarted: true,
            imageUrl: true,
            rarity: true
          },
          where: {
            deletedAt: null
          }
        }
      }
    })
  }

  findByPokedexNumber(pokedex_number: number): Promise<any> {
    return this.prismaService.pokemon.findFirst({
      where: {
        pokedex_number,
        deletedAt: null
      }
    })
  }

  // Assign types to Pokemon
  async assignTypes(pokemonId: number, data: AssignPokemonTypesBodyType): Promise<void> {
    // First, disconnect all current types
    await this.prismaService.pokemon.update({
      where: { id: pokemonId },
      data: {
        types: {
          set: [] // Clear all existing connections
        }
      }
    })

    // Then connect new types
    await this.prismaService.pokemon.update({
      where: { id: pokemonId },
      data: {
        types: {
          connect: data.typeIds.map((id) => ({ id }))
        }
      }
    })
  }

  // Get starter Pokemons
  getStarterPokemons(): Promise<any[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        isStarted: true,
        deletedAt: null
      },
      include: {
        types: {
          select: {
            id: true,
            type_name: true,
            display_name: true,
            color_hex: true
          }
        },
        nextPokemon: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          }
        },
        previousPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          },
          where: {
            deletedAt: null
          }
        }
      }
    })
  }

  // Get Pokemons by rarity
  getPokemonsByRarity(rarity: string): Promise<any[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        rarity: rarity as any,
        deletedAt: null
      },
      include: {
        types: {
          select: {
            id: true,
            type_name: true,
            display_name: true,
            color_hex: true
          }
        },
        nextPokemon: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          }
        },
        previousPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          },
          where: {
            deletedAt: null
          }
        }
      }
    })
  }

  // Helper methods for evolution relations
  async addToPreviousPokemons(
    nextPokemonId: number,
    currentPokemonId: number
  ): Promise<void> {
    await this.prismaService.pokemon.update({
      where: {
        id: nextPokemonId,
        deletedAt: null
      },
      data: {
        previousPokemons: {
          connect: { id: currentPokemonId }
        }
      }
    })
  }

  async removeFromPreviousPokemons(
    nextPokemonId: number,
    currentPokemonId: number
  ): Promise<void> {
    await this.prismaService.pokemon.update({
      where: {
        id: nextPokemonId,
        deletedAt: null
      },
      data: {
        previousPokemons: {
          disconnect: { id: currentPokemonId }
        }
      }
    })
  }
}
