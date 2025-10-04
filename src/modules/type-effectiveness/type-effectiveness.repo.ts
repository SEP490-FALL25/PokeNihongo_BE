import { parseQs } from '@/common/utils/qs-parser'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { TypeEffectiveness } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  CreateTypeEffectivenessBodyType,
  TYPE_EFFECTIVENESS_FIELDS,
  TypeEffectivenessType,
  UpdateTypeEffectivenessBodyType
} from './entities/type-effectiveness.entity'

type TypeEffectivenessWithRelations = TypeEffectiveness & {
  attacker?: {
    id: number
    type_name: string
    display_name: any
    color_hex: string
  }
  defender?: {
    id: number
    type_name: string
    display_name: any
    color_hex: string
  }
}

@Injectable()
export class TypeEffectivenessRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    createdById,
    data
  }: {
    createdById: number | null
    data: CreateTypeEffectivenessBodyType
  }): Promise<TypeEffectivenessType> {
    return this.prismaService.typeEffectiveness.create({
      data: {
        ...data,
        createdById
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
  }

  update({
    id,
    updatedById,
    data
  }: {
    id: number
    updatedById: number
    data: UpdateTypeEffectivenessBodyType
  }): Promise<TypeEffectivenessType> {
    return this.prismaService.typeEffectiveness.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        ...data,
        updatedById
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
  ): Promise<TypeEffectivenessType> {
    return isHard
      ? this.prismaService.typeEffectiveness.delete({
          where: {
            id
          }
        })
      : this.prismaService.typeEffectiveness.update({
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
    const { where, orderBy } = parseQs(pagination.qs, TYPE_EFFECTIVENESS_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.typeEffectiveness.count({
        where: { deletedAt: null, ...where }
      }),
      this.prismaService.typeEffectiveness.findMany({
        where: { deletedAt: null, ...where },
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

  findById(id: number): Promise<TypeEffectivenessType | null> {
    return this.prismaService.typeEffectiveness.findFirst({
      where: { id, deletedAt: null },
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
  }

  findByAttackerDefender(
    attackerId: number,
    defenderId: number
  ): Promise<TypeEffectivenessType | null> {
    return this.prismaService.typeEffectiveness.findFirst({
      where: {
        attackerId,
        defenderId,
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
  }

  async getAllActiveEffectiveness(): Promise<TypeEffectivenessWithRelations[]> {
    return this.prismaService.typeEffectiveness.findMany({
      where: { deletedAt: null },
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
      },
      orderBy: [{ attacker: { type_name: 'asc' } }, { defender: { type_name: 'asc' } }]
    })
  }

  async getEffectivenessMatrix(): Promise<{
    [attackerType: string]: {
      [defenderType: string]: number
    }
  }> {
    const effectiveness = await this.getAllActiveEffectiveness()

    const matrix: { [attackerType: string]: { [defenderType: string]: number } } = {}

    effectiveness.forEach((eff) => {
      if (eff.attacker && eff.defender) {
        if (!matrix[eff.attacker.type_name]) {
          matrix[eff.attacker.type_name] = {}
        }
        matrix[eff.attacker.type_name][eff.defender.type_name] = eff.multiplier
      }
    })

    return matrix
  }

  async getWeaknessesForDefender(
    defenderId: number
  ): Promise<TypeEffectivenessWithRelations[]> {
    return this.prismaService.typeEffectiveness.findMany({
      where: {
        defenderId,
        multiplier: { gt: 1 }, // Chỉ lấy những type effectiveness > 1 (super effective)
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
      },
      orderBy: [{ multiplier: 'desc' }, { attacker: { type_name: 'asc' } }]
    })
  }

  async getResistancesForDefender(
    defenderId: number
  ): Promise<TypeEffectivenessWithRelations[]> {
    return this.prismaService.typeEffectiveness.findMany({
      where: {
        defenderId,
        multiplier: { lt: 1 }, // Chỉ lấy những type effectiveness < 1 (not very effective)
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
      },
      orderBy: [{ multiplier: 'asc' }, { attacker: { type_name: 'asc' } }]
    })
  }
}
