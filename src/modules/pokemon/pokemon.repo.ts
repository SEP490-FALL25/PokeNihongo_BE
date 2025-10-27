import { RarityPokemon, RarityPokemonType } from '@/common/constants/pokemon.constant'
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
  nextPokemons?: Partial<PokemonType>[]
  previousPokemons?: Partial<PokemonType>[]
}

type PokemonWithTypesOnly = PokemonType & {
  types?: Array<{
    id: number
    type_name: string
    display_name: any
    color_hex: string
  }>
}

type PokemonBasic = PokemonType

@Injectable()
export class PokemonRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreatePokemonBodyType
  }): Promise<PokemonType> {
    const { typeIds, nextPokemonsId, ...pokemonData } = data
    return this.prismaService.pokemon.create({
      data: {
        ...pokemonData,
        nameTranslations: pokemonData.nameTranslations ?? {},
        createdById,
        // Connect elemental types
        types: {
          connect: typeIds.map((id) => ({ id }))
        },
        // Connect next Pokemons for evolution
        ...(nextPokemonsId &&
          nextPokemonsId.length > 0 && {
            nextPokemons: {
              connect: nextPokemonsId.map((id) => ({ id }))
            }
          })
      },
      include: {
        types: true,
        nextPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          }
        },
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
  }): Promise<PokemonType> {
    const { typeIds, nextPokemonsId, ...pokemonData } = data
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
        }),
        // Update next Pokemons nếu có
        ...(nextPokemonsId !== undefined && {
          nextPokemons: {
            set: [], // Clear existing evolution connections
            connect: nextPokemonsId.map((id) => ({ id })) // Connect new evolutions
          }
        })
      },
      include: {
        types: true,
        nextPokemons: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            imageUrl: true,
            rarity: true
          }
        },
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
  ): Promise<PokemonType | null> {
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
    const { where, orderBy } = parseQs(
      pagination.qs,
      POKEMON_FIELDS,
      ['types', 'rarities'], // relation fields - types là relation với ElementalType
      [] // array fields
    )

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
          nextPokemons: {
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

  async listWithNameNumImg(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(
      pagination.qs,
      POKEMON_FIELDS,
      ['types', 'rarities'], // relation fields - types là relation với ElementalType
      [] // array fields
    )

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.pokemon.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.pokemon.findMany({
        where: { deletedAt: null, ...where },
        select: {
          id: true,
          pokedex_number: true,
          nameJp: true,
          nameTranslations: true,
          imageUrl: true
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

  async getPokemonListWithPokemonUser(pagination: PaginationQueryType) {
    const { where, orderBy } = parseQs(
      pagination.qs,
      POKEMON_FIELDS,
      ['types', 'rarities'], // relation fields - types là relation với ElementalType
      [] // array fields
    )

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

  findById(id: number): Promise<PokemonWithRelations | null> {
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
        nextPokemons: {
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

  findByPokedexNumber(pokedex_number: number): Promise<PokemonType | null> {
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
  getStarterPokemons(): Promise<PokemonWithRelations[]> {
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
        nextPokemons: {
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
  getPokemonsByRarity(rarity: string): Promise<PokemonWithRelations[]> {
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
        nextPokemons: {
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

  getPokemonsByType(typeName: string): Promise<PokemonWithRelations[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        deletedAt: null,
        types: {
          some: {
            type_name: typeName,
            deletedAt: null
          }
        }
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
        nextPokemons: {
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

  // Get Pokemons that have no previous evolution (starter evolution list)
  getPokemonsWithoutPreviousEvolution(): Promise<PokemonBasic[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        deletedAt: null,
        previousPokemons: {
          none: {
            deletedAt: null
          }
        }
      },

      orderBy: {
        pokedex_number: 'asc'
      }
    })
  }

  /**
   * Lấy tất cả pokemon theo rarity (không bao gồm LEGENDARY)
   */
  async findByRarity(rarity: RarityPokemonType): Promise<PokemonBasic[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        deletedAt: null,
        rarity: RarityPokemon[rarity]
      }
    })
  }

  /**
   * Lấy tất cả pokemon có thể random (exclude LEGENDARY)
   */
  async findAllRandomable(): Promise<PokemonBasic[]> {
    return this.prismaService.pokemon.findMany({
      where: {
        deletedAt: null,
        rarity: {
          not: 'LEGENDARY'
        }
      }
    })
  }

  /**
   * Random pokemon theo rarity, typeIds, và limit
   * - Ưu tiên pokemon có type trong typeIds
   * - Chỉ lấy pokemon có previousPokemons = []
   * - Nếu không đủ số lượng từ typeIds, lấy thêm random theo rarity
   */
  async getRandomPokemonsByTypeAndRarity({
    limit,
    rarity,
    typeIds = [],
    excludeIds = []
  }: {
    limit: number
    rarity: RarityPokemonType
    typeIds?: number[]
    excludeIds?: number[]
  }): Promise<PokemonWithRelations[]> {
    const baseWhere = {
      deletedAt: null,
      rarity,
      id: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
      // Chỉ lấy pokemon base form (không có previousPokemons)
      previousPokemons: { none: {} }
    }

    let selectedPokemons: PokemonWithRelations[] = []

    // Bước 1: Ưu tiên pokemon có type trong typeIds
    if (typeIds.length > 0) {
      const pokemonsWithTypes = await this.prismaService.pokemon.findMany({
        where: {
          ...baseWhere,
          types: {
            some: {
              id: { in: typeIds }
            }
          }
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
          nextPokemons: {
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

      // Random từ pokemonsWithTypes
      const shuffled = pokemonsWithTypes.sort(() => 0.5 - Math.random())
      selectedPokemons = shuffled.slice(0, limit)
    }

    // Bước 2: Nếu chưa đủ số lượng, lấy thêm pokemon bất kỳ theo rarity
    if (selectedPokemons.length < limit) {
      const remaining = limit - selectedPokemons.length
      const selectedIds = selectedPokemons.map((p) => p.id)
      const allExcludeIds = [...excludeIds, ...selectedIds]

      const additionalPokemons = await this.prismaService.pokemon.findMany({
        where: {
          ...baseWhere,
          id: allExcludeIds.length > 0 ? { notIn: allExcludeIds } : undefined
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
          nextPokemons: {
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

      const shuffled = additionalPokemons.sort(() => 0.5 - Math.random())
      selectedPokemons.push(...shuffled.slice(0, remaining))
    }

    return selectedPokemons
  }
}
