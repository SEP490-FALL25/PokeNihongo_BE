import { UserStatus } from '@/common/constants/auth.constant'
import { DeviceType, RefreshTokenType } from '@/modules/auth/entities/auth.entities'
import { Injectable } from '@nestjs/common'
import { RoleType } from 'src/shared/models/shared-role.model'
import { UserType } from 'src/shared/models/shared-user.model'
import { WhereUniqueUserType } from 'src/shared/repositories/shared-user.repo'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class AuthRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findUniqueUser(where: WhereUniqueUserType): Promise<UserType | null> {
    return this.prismaService.user.findFirst({
      where: {
        ...where,
        deletedAt: null
      }
    })
  }

  async createUser(
    user: Pick<
      UserType,
      'email' | 'name' | 'password' | 'phoneNumber' | 'roleId' | 'avatar'
    >
  ): Promise<Omit<UserType, 'password'>> {
    const { password, ...userData } = user
    const createdUser = await this.prismaService.user.create({
      data: user
    })
    // Loại bỏ password khỏi kết quả trả về
    const { password: _, ...result } = createdUser
    return result as Omit<UserType, 'password'>
  }

  async createUserInclueRole(
    user: Pick<
      UserType,
      'email' | 'name' | 'password' | 'phoneNumber' | 'avatar' | 'roleId'
    >
  ): Promise<UserType & { role: RoleType }> {
    return this.prismaService.user.create({
      data: {
        email: user.email,
        name: user.name,
        password: user.password,
        phoneNumber: user.phoneNumber,
        avatar: user.avatar,
        roleId: user.roleId
      },
      include: {
        role: true
      }
    })
  }

  async registerUser(
    user: Pick<UserType, 'email' | 'roleId' | 'password'> & {
      name: string
      phoneNumber: string
    }
  ): Promise<Omit<UserType, 'password'>> {
    const { password, ...userData } = user
    const createdUser = await this.prismaService.user.create({
      data: {
        ...user,
        status: UserStatus.ACTIVE
      },
      include: {
        role: true
      }
    })
    // Loại bỏ password khỏi kết quả trả về
    const { password: _, ...result } = createdUser
    return result as Omit<UserType, 'password'>
  }

  // async createVerificationCode(
  //   payload: Pick<VerificationCodeType, 'email' | 'type' | 'code' | 'expiresAt'>
  // ): Promise<VerificationCodeType> {
  //   return this.prismaService.verificationCode.upsert({
  //     where: {
  //       email_code_type: {
  //         email: payload.email,
  //         code: payload.code,
  //         type: payload.type
  //       }
  //     },
  //     create: payload,
  //     update: {
  //       code: payload.code,
  //       expiresAt: payload.expiresAt
  //     }
  //   })
  // }

  // async findUniqueVerificationCode(
  //   uniqueValue:
  //     | { id: number }
  //     | {
  //         email_code_type: {
  //           email: string
  //           code: string
  //           type: TypeOfVerificationCodeType
  //         }
  //       }
  // ): Promise<VerificationCodeType | null> {
  //   return this.prismaService.verificationCode.findUnique({
  //     where: uniqueValue
  //   })
  // }

  createRefreshToken(data: {
    token: string
    userId: number
    expiresAt: Date
    deviceId: number
  }) {
    return this.prismaService.refreshToken.create({
      data
    })
  }

  createDevice(
    data: Pick<DeviceType, 'userId' | 'userAgent' | 'ip' | 'deviceToken'> &
      Partial<Pick<DeviceType, 'lastActive' | 'isActive'>>
  ) {
    return this.prismaService.device.create({
      data
    })
  }

  findDeviceByUserAndAgent(userId: number, userAgent: string, ip: string) {
    return this.prismaService.device.findFirst({
      where: {
        userId,
        userAgent,
        ip
      }
    })
  }

  async createOrUpdateDevice(
    data: Pick<DeviceType, 'userId' | 'userAgent' | 'ip' | 'deviceToken'> &
      Partial<Pick<DeviceType, 'lastActive' | 'isActive'>>
  ) {
    // Kiểm tra device đã tồn tại chưa
    const existingDevice = await this.findDeviceByUserAndAgent(
      data.userId,
      data.userAgent,
      data.ip
    )

    if (existingDevice) {
      // Nếu device đã tồn tại, update thông tin
      return this.updateDevice(existingDevice.id, {
        ip: data.ip,
        lastActive: new Date(),
        isActive: true
      })
    }

    // Nếu chưa tồn tại, tạo mới
    return this.createDevice(data)
  }

  async findUniqueUserIncludeRole(
    where: WhereUniqueUserType
  ): Promise<(UserType & { role: RoleType }) | null> {
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

  async findUniqueRefreshTokenIncludeUserRole(where: {
    token: string
  }): Promise<(RefreshTokenType & { user: UserType & { role: RoleType } }) | null> {
    return this.prismaService.refreshToken.findUnique({
      where,
      include: {
        user: {
          include: {
            role: true
          }
        }
      }
    })
  }

  updateDevice(deviceId: number, data: Partial<DeviceType>): Promise<DeviceType> {
    return this.prismaService.device.update({
      where: {
        id: deviceId
      },
      data
    })
  }

  deleteRefreshToken(where: { token: string }): Promise<RefreshTokenType> {
    return this.prismaService.refreshToken.delete({
      where
    })
  }

  // deleteVerificationCode(
  //   uniqueValue:
  //     | { id: number }
  //     | {
  //         email_code_type: {
  //           email: string
  //           code: string
  //           type: TypeOfVerificationCodeType
  //         }
  //       }
  // ): Promise<VerificationCodeType> {
  //   return this.prismaService.verificationCode.delete({
  //     where: uniqueValue
  //   })
  // }

  verifyEmail(email: string): Promise<UserType> {
    return this.prismaService.user.update({
      where: { email },
      data: { status: UserStatus.ACTIVE }
    })
  }

  deleteManyRefreshTokenByUserId(where: { userId: number }): Promise<{ count: number }> {
    return this.prismaService.refreshToken.deleteMany({
      where
    })
  }

  deleteManyDeviceByUserId(where: { userId: number }): Promise<{ count: number }> {
    return this.prismaService.device.deleteMany({
      where
    })
  }

  existEmail(email: string): Promise<UserType | null> {
    return this.prismaService.user.findFirst({
      where: {
        email,
        deletedAt: null
      }
    })
  }
}
