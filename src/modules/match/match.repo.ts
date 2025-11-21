import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'

import { MatchStatus, MatchStatusType } from '@/common/constants/match.constant'
import { parseQs } from '@/common/utils/qs-parser'
import { PrismaClient } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import { MatchParticipantType } from '../match-participant/entities/match-participant.entity'
import {
  CreateMatchBodyType,
  MATCH_FIELDS,
  MatchType,
  UpdateMatchBodyType
} from './entities/match.entity'

type MatchPrismaType = Omit<MatchType, 'nameKey'> & { name: string }

@Injectable()
export class MatchRepo {
  constructor(private prismaService: PrismaService) {}

  // Wrapper cho transaction
  async withTransaction<T>(callback: (prismaTx: PrismaClient) => Promise<T>): Promise<T> {
    return this.prismaService.$transaction(callback)
  }

  create(
    {
      createdById,
      data
    }: {
      createdById: number | null
      data: CreateMatchBodyType & { leaderboardSeasonId: number }
    },
    prismaTx?: PrismaClient
  ): Promise<MatchType> {
    const client = prismaTx || this.prismaService
    return client.match.create({
      data: {
        ...data
      }
    })
  }

  async update(
    {
      id,
      updatedById,
      data
    }: {
      id: number
      updatedById?: number
      data: UpdateMatchBodyType
    },
    prismaTx?: PrismaClient
  ): Promise<MatchType> {
    const client = prismaTx || this.prismaService

    const updatedMatch = await client.match.update({
      where: { id, deletedAt: null },
      data: {
        ...data
      }
    })

    return updatedMatch
  }

  async delete(
    {
      id,
      deletedById
    }: {
      id: number
      deletedById: number
    },
    isHard?: boolean,
    prismaTx?: PrismaClient
  ): Promise<MatchType> {
    const client = prismaTx || this.prismaService
    const result = isHard
      ? await this.prismaService.match.delete({
          where: {
            id
          }
        })
      : await client.match.update({
          where: {
            id,
            deletedAt: null
          },
          data: {
            deletedAt: new Date()
          }
        })
    return result
  }

  async list(pagination: PaginationQueryType, langId?: number) {
    const { where: rawWhere = {}, orderBy } = parseQs(pagination.qs, MATCH_FIELDS)

    const skip = (pagination.currentPage - 1) * pagination.pageSize
    const take = pagination.pageSize

    // Build base where
    const where: any = { deletedAt: null, ...rawWhere }

    // Support filtering by nameTranslation/nameTranslations via relational filter

    const [totalItems, data] = await Promise.all([
      this.prismaService.match.count({ where }),
      this.prismaService.match.findMany({
        where,

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

  findById(id: number): Promise<MatchType | null> {
    return this.prismaService.match.findUnique({
      where: {
        id,
        deletedAt: null
      }
    })
  }
  findByIdWithParticipant(
    id: number
  ): Promise<(MatchType & { participants: MatchParticipantType[] }) | null> {
    return this.prismaService.match.findUnique({
      where: {
        id,
        deletedAt: null
      },
      include: {
        participants: true
      }
    })
  }

  findInProgressByUserId(userId: number): Promise<MatchType | null> {
    return this.prismaService.match.findFirst({
      where: {
        status: 'IN_PROGRESS',
        deletedAt: null,
        participants: {
          some: {
            userId
          }
        }
      },
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    })
  }

  getMatchWithRoundsByUserId(userId: number) {
    return this.prismaService.match.findFirst({
      where: {
        status: 'IN_PROGRESS',
        deletedAt: null,
        participants: {
          some: {
            userId
          }
        }
      },
      include: {
        rounds: {
          include: {
            participants: {
              select: {
                selectedUserPokemonId: true
              }
            }
          }
        }
      }
    })
  }

  updateWithStatusById(status: MatchStatusType, id: number): Promise<MatchType> {
    return this.prismaService.match.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        status
      }
    })
  }
  updateWinnerAndEloById({
    data: { winnerId, eloGained, eloLost },
    id
  }: {
    data: {
      winnerId: number
      eloGained: number
      eloLost: number
    }
    id: number
  }): Promise<MatchType> {
    return this.prismaService.match.update({
      where: {
        id,
        deletedAt: null
      },
      data: {
        winnerId,
        eloGained,
        eloLost
      }
    })
  }

  findActiveMatchByUserId(userId: number): Promise<MatchType | null> {
    return this.prismaService.match.findFirst({
      where: {
        status: { in: ['IN_PROGRESS', 'PENDING'] },
        deletedAt: null,
        participants: {
          some: {
            userId
          }
        }
      }
    })
  }

  countMatchesByUserId(userId: number): Promise<number> {
    return this.prismaService.match.count({
      where: {
        participants: {
          some: {
            userId
          }
        },
        status: {
          not: MatchStatus.CANCELLED
        },
        deletedAt: null
      }
    })
  }

  countWinsByUserId(userId: number): Promise<number> {
    return this.prismaService.match.count({
      where: {
        winnerId: userId,
        deletedAt: null
      }
    })
  }

  getMatchesByUser(userId: number, langId?: number): Promise<MatchType[]> {
    return this.prismaService.match.findMany({
      where: {
        participants: {
          some: { userId }
        },
        status: {
          not: 'CANCELLED'
        },
        deletedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        participants: true,
        leaderboardSeason: {
          include: {
            nameTranslations: {
              where: { languageId: langId },
              select: { value: true, languageId: true }
            }
          }
        }
      }
    })
  }
  // Nếu pagination được truyền vào sẽ trả về cấu trúc paginated { results, pagination }
  // Ngược lại trả về mảng đầy đủ như trước để không phá vỡ các caller hiện tại.
  async getMatchesHistoryByUser(
    userId: number,
    langId?: number,
    pagination?: PaginationQueryType
  ): Promise<any> {
    const baseWhere: any = {
      participants: {
        some: { userId }
      },
      status: 'COMPLETED',
      deletedAt: null
    }

    const include = {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      },
      leaderboardSeason: {
        include: {
          nameTranslations: {
            where: { languageId: langId },
            select: { value: true, languageId: true }
          }
        }
      }
    }

    if (!pagination) {
      return this.prismaService.match.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        include
      })
    }

    const currentPage = pagination.currentPage || 1
    const pageSize = pagination.pageSize || 20
    const skip = (currentPage - 1) * pageSize
    const take = pageSize

    const [totalItems, data] = await Promise.all([
      this.prismaService.match.count({ where: baseWhere }),
      this.prismaService.match.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include
      })
    ])

    return {
      results: data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage: Math.ceil(totalItems / pageSize),
        totalItem: totalItems
      }
    }
  }
  async checkUserHasJoinedSeason(userId: number, seasonId: number): Promise<boolean> {
    return (await this.prismaService.userSeasonHistory.count({
      where: {
        userId,
        seasonId,
        deletedAt: null
      }
    })) > 0
      ? true
      : false
  }
}
