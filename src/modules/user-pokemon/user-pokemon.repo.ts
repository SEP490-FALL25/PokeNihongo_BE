import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateUserPokemonBodyType,
  UpdateUserPokemonBodyType,
  USER_POKEMON_FIELDS,
  UserPokemonType
} from './entities/user-pokemon.entity'

type UserPokemonWithRelations = UserPokemonType & {
  user?: {
    id: number
    name: string
    email: string
  }
  pokemon?: {
    id: number
    pokedex_number: number
    nameJp: string
    nameTranslations: any
    description: string | null
    conditionLevel: number | null
    imageUrl: string | null
    rarity: string
    types?: Array<{
      id: number
      type_name: string
      display_name: any
      color_hex: string
    }>
    nextPokemons?: Array<{
      id: number
      pokedex_number: number
      nameJp: string
      nameTranslations: any
      description: string | null
      conditionLevel: number | null
      isStarted: boolean | null
      imageUrl: string | null
      rarity: string
      types?: Array<{
        id: number
        type_name: string
        display_name: any
        color_hex: string
      }>
    }>
    previousPokemons?: Array<{
      id: number
      pokedex_number: number
      nameJp: string
      nameTranslations: any
      description: string | null
      conditionLevel: number | null
      isStarted: boolean | null
      imageUrl: string | null
      rarity: string
      types?: Array<{
        id: number
        type_name: string
        display_name: any
        color_hex: string
      }>
    }>
  }
  level?: {
    id: number
    levelNumber: number
    requiredExp: number
    levelType: string
  }
}

type UserPokemonBasic = UserPokemonType

@Injectable()
export class UserPokemonRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    userId,
    data
  }: {
    userId: number
    data: CreateUserPokemonBodyType & { levelId?: number }
  }): Promise<UserPokemonBasic> {
    return this.prismaService.userPokemon.create({
      data: {
        ...data,
        userId,
        // If no levelId provided, get the first Pokemon level
        levelId: data.levelId || 1 // Default to level 1, should be handled in service
      }
    })
  }

  update({
    id,
    data
  }: {
    id: number
    data: UpdateUserPokemonBodyType
  }): Promise<UserPokemonBasic> {
    return this.prismaService.userPokemon.update({
      where: {
        id,
        deletedAt: null
      },
      data
    })
  }

  delete(id: number, isHard?: boolean): Promise<UserPokemonBasic> {
    return isHard
      ? this.prismaService.userPokemon.delete({
          where: { id }
        })
      : this.prismaService.userPokemon.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
  }

  async getByUserId(userId: number): Promise<UserPokemonType[]> {
    return this.prismaService.userPokemon.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        pokemon: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            description: true,
            imageUrl: true,
            rarity: true,
            types: {
              select: {
                id: true,
                type_name: true,
                display_name: true,
                color_hex: true
              }
            }
          }
        },
        level: {
          select: {
            id: true,
            levelNumber: true,
            requiredExp: true,
            levelType: true
          }
        },
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: [{ createdAt: 'desc' }]
    })
  }

  async list(pagination: PaginationQueryType, userId?: number) {
    const { where, orderBy } = parseQs(pagination.qs, USER_POKEMON_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const filterWhere = {
      deletedAt: null,
      ...(userId && { userId }),
      ...where
    }

    const [totalItems, data] = await Promise.all([
      this.prismaService.userPokemon.count({
        where: filterWhere
      }),
      this.prismaService.userPokemon.findMany({
        where: filterWhere,
        include: {
          pokemon: {
            select: {
              id: true,
              pokedex_number: true,
              nameJp: true,
              nameTranslations: true,
              description: true,
              imageUrl: true,
              rarity: true,
              types: {
                select: {
                  id: true,
                  type_name: true,
                  display_name: true,
                  color_hex: true
                }
              }
            }
          },
          level: {
            select: {
              id: true,
              levelNumber: true,
              requiredExp: true,
              levelType: true
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

  findById(id: number): Promise<UserPokemonWithRelations | null> {
    return this.prismaService.userPokemon.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        pokemon: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            description: true,
            conditionLevel: true,
            imageUrl: true,
            rarity: true,
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
                rarity: true,
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
                    rarity: true,
                    types: {
                      select: {
                        id: true,
                        type_name: true,
                        display_name: true,
                        color_hex: true
                      }
                    }
                  }
                }
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
                rarity: true,
                types: {
                  select: {
                    id: true,
                    type_name: true,
                    display_name: true,
                    color_hex: true
                  }
                }
              },
              where: {
                deletedAt: null
              }
            }
          }
        },
        level: {
          select: {
            id: true,
            levelNumber: true,
            requiredExp: true,
            levelType: true
          }
        }
      }
    })
  }

  findByUserAndPokemon(
    userId: number,
    pokemonId: number
  ): Promise<UserPokemonBasic | null> {
    return this.prismaService.userPokemon.findFirst({
      where: {
        userId,
        pokemonId,
        deletedAt: null
      }
    })
  }

  findByUserAndNickname(
    userId: number,
    nickname: string
  ): Promise<UserPokemonBasic | null> {
    return this.prismaService.userPokemon.findFirst({
      where: {
        userId,
        nickname,
        deletedAt: null
      }
    })
  }

  // Get user's Pokemon by user ID
  getUserPokemons(userId: number): Promise<UserPokemonType[]> {
    return this.prismaService.userPokemon.findMany({
      where: {
        userId,
        deletedAt: null
      },
      include: {
        pokemon: {
          select: {
            id: true,
            pokedex_number: true,
            nameJp: true,
            nameTranslations: true,
            description: true,
            imageUrl: true,
            rarity: true,
            types: {
              select: {
                id: true,
                type_name: true,
                display_name: true,
                color_hex: true
              }
            }
          }
        },
        level: {
          select: {
            id: true,
            levelNumber: true,
            requiredExp: true,
            levelType: true
          }
        }
      },
      orderBy: [{ createdAt: 'desc' }]
    })
  }

  // Add EXP to UserPokemon
  async addExp(id: number, expAmount: number): Promise<UserPokemonBasic> {
    return this.prismaService.userPokemon.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        exp: {
          increment: expAmount
        }
      }
    })
  }

  // Level up Pokemon
  async levelUp(id: number, newLevelId: number): Promise<UserPokemonBasic> {
    return this.prismaService.userPokemon.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        levelId: newLevelId,
        exp: 0 // Reset EXP when leveling up
      }
    })
  }

  // Unset main pokemon for a user (set all isMain to false)
  async unsetMainPokemon(userId: number): Promise<void> {
    await this.prismaService.userPokemon.updateMany({
      where: {
        userId,
        deletedAt: null
      },
      data: {
        isMain: false
      }
    })
  }
}
