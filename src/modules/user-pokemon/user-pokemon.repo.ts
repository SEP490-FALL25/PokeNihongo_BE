import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateUserPokemonBodyType,
  UpdateUserPokemonBodyType,
  USER_POKEMON_FIELDS
} from './entities/user-pokemon.entity'

@Injectable()
export class UserPokemonRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    userId,
    data
  }: {
    userId: number
    data: CreateUserPokemonBodyType
  }): Promise<any> {
    return this.prismaService.userPokemon.create({
      data: {
        ...data,
        userId,
        // If no levelId provided, get the first Pokemon level
        levelId: data.levelId || 1 // Default to level 1, should be handled in service
      }
    })
  }

  update({ id, data }: { id: number; data: UpdateUserPokemonBodyType }): Promise<any> {
    return this.prismaService.userPokemon.update({
      where: {
        id,
        deletedAt: null
      },
      data
    })
  }

  delete(id: number, isHard?: boolean): Promise<any> {
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

  findById(id: number): Promise<any> {
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
      }
    })
  }

  findByUserAndPokemon(userId: number, pokemonId: number): Promise<any> {
    return this.prismaService.userPokemon.findFirst({
      where: {
        userId,
        pokemonId,
        deletedAt: null
      }
    })
  }

  findByUserAndNickname(userId: number, nickname: string): Promise<any> {
    return this.prismaService.userPokemon.findFirst({
      where: {
        userId,
        nickname,
        deletedAt: null
      }
    })
  }

  // Get user's Pokemon by user ID
  getUserPokemons(userId: number): Promise<any[]> {
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
  async addExp(id: number, expAmount: number): Promise<any> {
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
  async levelUp(id: number, newLevelId: number): Promise<any> {
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
}
