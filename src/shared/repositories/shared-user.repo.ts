import { Injectable } from '@nestjs/common'
import { PermissionType } from 'src/shared/models/shared-permission.model'
import { RoleType } from 'src/shared/models/shared-role.model'
import { UserType } from 'src/shared/models/shared-user.model'
import { PrismaService } from 'src/shared/services/prisma.service'

type UserIncludeRolePermissionsType = UserType & {
  role: RoleType & { permissions: PermissionType[] }
}
type UserIncludeRoleType = UserType & {
  role: RoleType
}

type UserProfileWithStatsType = UserType & {
  role: RoleType
  level: any | null
  _count: {
    userPokemons: number
  }
}

export type WhereUniqueUserType = { id: number } | { email: string }

@Injectable()
export class SharedUserRepository {
  constructor(private readonly prismaService: PrismaService) {}

  findUnique(where: WhereUniqueUserType): Promise<UserType | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      }
    })
  }
  findUniqueIncludeRole(where: WhereUniqueUserType): Promise<UserIncludeRoleType | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      },
      include: {
        role: true
      }
    })
  }

  findUniqueIncludeRolePermissions(
    where: WhereUniqueUserType
  ): Promise<UserIncludeRolePermissionsType | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      },
      include: {
        role: {
          include: {
            permissions: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    })
  }

  findUniqueProfileWithStats(
    where: WhereUniqueUserType
  ): Promise<UserProfileWithStatsType | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      },
      include: {
        role: true,
        level: {
          include: {
            nextLevel: true
          }
        },
        _count: {
          select: {
            userPokemons: {
              where: {
                deletedAt: null
              }
            }
          }
        }
      }
    })
  }

  update(where: { id: number }, data: Partial<UserType>): Promise<UserType | null> {
    return this.prismaService.user.update({
      where: {
        ...where,
        deletedAt: null
      },
      data
    })
  }
}
