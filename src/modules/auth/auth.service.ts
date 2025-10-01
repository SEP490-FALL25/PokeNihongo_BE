import { BullQueueService } from '@/3rdService/bull/bull-queue.service'
import { MailService } from '@/3rdService/mail/mail.service'
import { TypeOfVerificationCode, UserStatus } from '@/common/constants/auth.constant'
import { AUTH_MESSAGE } from '@/common/constants/message'
import { RoleName } from '@/common/constants/role.constant'
import { AuthRepository } from '@/modules/auth/auth.repo'
import {
  EmailAlreadyExistsException,
  EmailNotFoundException,
  FailToLoginException,
  InvalidOTPExceptionForEmail,
  NeedToVerifyWithFirstLogin,
  RefreshTokenAlreadyUsedException,
  UnauthorizedAccessException,
  UnVeryfiedAccountException
} from '@/modules/auth/dto/auth.error'
import {
  ChangePasswordBodyType,
  ForgotPasswordBodyType,
  LoginBodyType,
  RefreshTokenBodyType,
  RegisterBodyType,
  ResetPasswordBodyType,
  UpdateMeBodyType,
  verifyForgotPasswordBodyType
} from '@/modules/auth/entities/auth.entities'
import {
  InValidNewPasswordAndConfirmPasswordException,
  InvalidOldPasswordException,
  NotFoundRecordException
} from '@/shared/error'
import { isNotFoundPrismaError, isUniqueConstraintPrismaError } from '@/shared/helpers'
import { SharedRoleRepository } from '@/shared/repositories/shared-role.repo'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { HashingService } from '@/shared/services/hashing.service'
import { TokenService } from '@/shared/services/token.service'
import { AccessTokenPayloadCreate } from '@/shared/types/jwt.type'
import { InjectQueue } from '@nestjs/bull'
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger
} from '@nestjs/common'
import { Queue } from 'bull'
import Redis from 'ioredis'
import { v4 as uuidv4 } from 'uuid'
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  constructor(
    private readonly hashingService: HashingService,
    private readonly sharedRoleRepository: SharedRoleRepository,
    private readonly authRepository: AuthRepository,
    private readonly sharedUserRepository: SharedUserRepository,
    private readonly mailService: MailService,

    private readonly bullQueueService: BullQueueService,
    @InjectQueue('user-deletion') private readonly deletionQueue: Queue,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    private readonly tokenService: TokenService
  ) {}

  async login(body: LoginBodyType & { userAgent: string; ip: string }) {
    // 1. Lấy thông tin user, kiểm tra user có tồn tại hay không, mật khẩu có đúng không
    const user = await this.authRepository.findUniqueUserIncludeRole({
      email: body.email.toLowerCase()
    })

    if (!user) {
      throw FailToLoginException
    }

    const isPasswordMatch = await this.hashingService.compare(
      body.password,
      user.password
    )
    if (!isPasswordMatch) {
      throw FailToLoginException
    }

    // user verify chua ?
    if (user.status === UserStatus.INACTIVE) {
      this.resendVerifiedEmail(user.email)
      throw UnVeryfiedAccountException
    }

    // Kiểm tra xem device đã tồn tại chưa
    const existingDevice = await this.authRepository.findDeviceByUserAndAgent(
      user.id,
      body.userAgent,
      body.ip
    )

    if (!existingDevice) {
      throw NeedToVerifyWithFirstLogin
    }

    // 3. Kiểm tra và tạo/cập nhật device
    const device = await this.authRepository.createOrUpdateDevice({
      userId: user.id,
      userAgent: body.userAgent,
      deviceToken: uuidv4(),
      ip: body.ip
    })

    // 4. Tạo mới accessToken và refreshToken
    const tokens = await this.generateTokens({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name
    })
    const { password, ...userWithoutPassword } = user
    const data = {
      ...userWithoutPassword,
      ...tokens,
      device: {
        id: device.id,
        deviceToken: device.deviceToken
      }
    }
    return {
      data,
      message: 'Đăng nhập thành công'
    }
  }

  async register(body: RegisterBodyType, userAgent: string, ip: string) {
    try {
      const hashedPassword = await this.hashingService.hash(body.password)

      const roleId = await this.sharedRoleRepository.getCustomerRoleId()
      const [user] = await Promise.all([
        this.authRepository.registerUser({
          email: body.email.toLowerCase(),
          password: hashedPassword,
          roleId,
          name: body.name,
          phoneNumber: body.phoneNumber
        })
      ])
      // tao device
      const device = await this.createUserDevice(user.id, userAgent, ip)
      // nhan role
      const role = await this.sharedRoleRepository.getRoleById(roleId)
      // 4. Tạo mới accessToken và refreshToken
      const tokens = await this.generateTokens({
        userId: user.id,
        deviceId: device.id,
        roleId: user.roleId,
        roleName: role?.name || RoleName.Customer
      })

      const { ...userWithoutPassword } = user
      const data = {
        ...userWithoutPassword,
        ...tokens,
        device: {
          id: device.id,
          deviceToken: device.deviceToken
        }
      }

      return {
        statusCode: HttpStatus.CREATED,
        data: data,
        message: AUTH_MESSAGE.REGISTER_SUCCESS
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw EmailAlreadyExistsException
      }
      throw error
    }
  }

  async generateTokens({ userId, deviceId, roleId, roleName }: AccessTokenPayloadCreate) {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken({
        userId,
        deviceId,
        roleId,
        roleName
      }),
      this.tokenService.signRefreshToken({
        userId
      })
    ])
    const decodedRefreshToken = await this.tokenService.verifyRefreshToken(refreshToken)
    await this.authRepository.createRefreshToken({
      token: refreshToken,
      userId,
      expiresAt: new Date(decodedRefreshToken.exp * 1000),
      deviceId
    })
    return { accessToken, refreshToken }
  }

  async refreshToken({
    refreshToken,
    userAgent,
    ip
  }: RefreshTokenBodyType & { userAgent: string; ip: string }) {
    try {
      // 1. Kiểm tra refreshToken có hợp lệ không
      const { userId } = await this.tokenService.verifyRefreshToken(refreshToken)
      // 2. Kiểm tra refreshToken có tồn tại trong database không
      const refreshTokenInDb =
        await this.authRepository.findUniqueRefreshTokenIncludeUserRole({
          token: refreshToken
        })
      if (!refreshTokenInDb) {
        // Trường hợp đã refresh token rồi, hãy thông báo cho user biết
        // refresh token của họ đã bị đánh cắp
        throw RefreshTokenAlreadyUsedException
      }
      const {
        deviceId,
        user: {
          roleId,
          role: { name: roleName }
        }
      } = refreshTokenInDb
      // 3. Cập nhật device
      const $updateDevice = this.authRepository.updateDevice(deviceId, {
        ip,
        userAgent
      })
      // 4. Xóa refreshToken cũ
      const $deleteRefreshToken = this.authRepository.deleteRefreshToken({
        token: refreshToken
      })
      const userInfo = this.authRepository.findUniqueUserIncludeRole({ id: userId })
      // 5. Tạo mới accessToken và refreshToken
      const $tokens = this.generateTokens({ userId, roleId, roleName, deviceId })
      const [, , tokens, userData] = await Promise.all([
        $updateDevice,
        $deleteRefreshToken,
        $tokens,
        userInfo
      ])
      return {
        data: {
          ...userData,
          ...tokens
        },
        message: AUTH_MESSAGE.REFRESH_TOKEN_SUCCESS
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error
      }
      throw UnauthorizedAccessException
    }
  }

  async logout(refreshToken: string) {
    try {
      // 1. Kiểm tra refreshToken có hợp lệ không
      await this.tokenService.verifyRefreshToken(refreshToken)
      // 2. Xóa refreshToken trong database
      const deletedRefreshToken = await this.authRepository.deleteRefreshToken({
        token: refreshToken
      })
      // 3. Cập nhật device là đã logout
      await this.authRepository.updateDevice(deletedRefreshToken.deviceId, {
        isActive: false
      })
      return { data: null, message: AUTH_MESSAGE.LOGOUT_SUCCESS }
    } catch (error) {
      // Trường hợp đã refresh token rồi, hãy thông báo cho user biết
      // refresh token của họ đã bị đánh cắp
      if (isNotFoundPrismaError(error)) {
        throw RefreshTokenAlreadyUsedException
      }
      throw UnauthorizedAccessException
    }
  }

  async forgotPassword(body: ForgotPasswordBodyType) {
    const { email } = body
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.sharedUserRepository.findUnique({
      email
    })
    if (!user) {
      throw EmailNotFoundException
    }

    if (user.status === UserStatus.INACTIVE) {
      throw UnVeryfiedAccountException
    }

    // Send email
    const registerEmailLowerCase = user.email.toLowerCase()
    const template = 'otp'
    const content = 'Mã OTP của bạn là: '
    const bodyContent = 'Vui lòng nhập mã OTP để làm bước tiếp theo.'
    this.mailService.generateAndSendOtp(
      registerEmailLowerCase,
      template,
      content,
      bodyContent
    )
    return {
      statusCode: HttpStatus.OK,
      data: {
        type: TypeOfVerificationCode.FORGOT_PASSWORD
      },
      message: AUTH_MESSAGE.SEND_OTP_SUCCESS
    }
  }

  async verifyForgotPassword(
    body: verifyForgotPasswordBodyType,
    userAgent: string,
    ip: string
  ) {
    const { email, code } = body
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.sharedUserRepository.findUniqueIncludeRole({
      email
    })
    if (!user) {
      throw InvalidOTPExceptionForEmail
    }

    // Verify OTP
    await this.mailService.verifyOtpStrict(email, code)

    // 2. Xóa tất cả refreshToken và device cũ của user
    await Promise.all([
      this.authRepository.deleteManyRefreshTokenByUserId({ userId: user.id }),
      this.authRepository.deleteManyDeviceByUserId({ userId: user.id })
    ])

    // 3. Tạo device mới sau khi xóa hết device cũ
    const device = await this.authRepository.createDevice({
      userId: user.id,
      userAgent: userAgent,
      ip: ip,
      deviceToken: uuidv4()
    })

    // 4. Tạo accessToken cho device mới
    const accessToken = await this.tokenService.signAccessToken({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name
    })

    const data = {
      accessToken
    }

    return {
      data,
      message: AUTH_MESSAGE.VERIFY_OTP_FORGOT_PASSWORD_SUCCESS
    }
  }

  async resetPassword(body: ResetPasswordBodyType, userId: number) {
    const { newPassword, email, confirmNewPassword } = body
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.sharedUserRepository.findUnique({ email })

    if (!user || user.id !== userId) {
      throw EmailNotFoundException
    }

    // tới đây đổi mật khẩu cho nó
    const hashedPassword = await this.hashingService.hash(newPassword)
    await Promise.all([
      this.sharedUserRepository.update(
        { id: user.id },
        {
          password: hashedPassword,
          updatedById: user.id
        }
      )
    ])

    return {
      data: null,
      message: AUTH_MESSAGE.RESET_PASSWORD_SUCCESS
    }
  }

  async changePassword(body: ChangePasswordBodyType, userId: number) {
    const { password, newPassword, confirmNewPassword } = body
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.sharedUserRepository.findUnique({ id: userId })

    if (!user) {
      throw EmailNotFoundException
    }
    //check password == password cu
    if (newPassword !== confirmNewPassword) {
      throw InValidNewPasswordAndConfirmPasswordException
    }
    const isPasswordMatch = await this.hashingService.compare(password, user.password)
    if (!isPasswordMatch) {
      throw InvalidOldPasswordException
    }

    // tới đây đổi mật khẩu cho nó
    const hashedPassword = await this.hashingService.hash(newPassword)
    await Promise.all([
      this.sharedUserRepository.update(
        { id: user.id },
        {
          password: hashedPassword,
          updatedById: user.id
        }
      )
    ])

    return {
      data: null,
      message: AUTH_MESSAGE.CHANGE_PASSWORD_SUCCESS
    }
  }

  async getMe(userId: number) {
    const user = await this.sharedUserRepository.findUniqueIncludeRolePermissions({
      id: userId
    })
    if (!user) {
      throw EmailNotFoundException
    }
    return user
  }

  async updateMe({ data, userId }: { data: UpdateMeBodyType; userId: number }) {
    const user = await this.sharedUserRepository.findUnique({
      id: userId
    })
    if (!user) {
      throw NotFoundRecordException
    }
    const updatedUser = await this.sharedUserRepository.update(
      { id: userId },
      {
        ...data,
        updatedById: userId
      }
    )
    return {
      data: updatedUser,
      message: AUTH_MESSAGE.UPDATE_PROFILE_SUCCESS
    }
  }

  async verifiedEmail(email: string) {
    try {
      const data = await this.authRepository.verifyEmail(email)
      return {
        data,
        message: 'Xác thực email thành công'
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw EmailNotFoundException
      }
      throw error
    }
  }

  async resendVerifiedEmail(email: string) {
    const template = 'otp'
    const content = 'XÁC THỰC MAIL CỦA BẠN: '
    const bodyContent = 'Vui lòng nhập nhấn nút XÁC THỰC để xác thực tài khoản của bạn.'
    this.mailService.generateAndSendOtp(email, template, content, bodyContent)

    return {
      data: null,
      message: 'Gửi lại email xác thực thành công'
    }
  }

  async checkMailToAction(email: string, userAgent: string, ip: string) {
    const user = await this.authRepository.existEmail(email)
    if (!user) {
      // neu khong co -> register
      //send otp mail
      // 2. send mail de xác thực
      const emailLower = email.toLowerCase()
      const template = 'otp'
      const content = 'MÃ OTP MAIL ĐĂNG KÝ CỦA BẠN: '
      const bodyContent = 'Vui lòng nhập mã OTP để tiếp tục bước tiếp theo.'
      this.mailService.generateAndSendOtp(emailLower, template, content, bodyContent)
      return {
        statusCode: 201,
        data: {
          type: TypeOfVerificationCode.REGISTER
        },
        message: 'Email hợp lệ, bạn có thể tiếp tục đăng ký'
      }
    }

    // neu user ton tai -> login

    // check xem la thiet bi moi hay cu
    // Kiểm tra xem device đã tồn tại chưa
    const existingDevice = await this.authRepository.findDeviceByUserAndAgent(
      user.id,
      userAgent,
      ip
    )

    if (!existingDevice) {
      // Đây là lần đăng nhập đầu tiên từ thiết bị này, gửi email thông báo
      const template = 'otp'
      const content = 'XÁC THỰC ĐĂNG NHẬP TỪ THIẾT BỊ MỚI: '
      const bodyContent = `Chúng tôi phát hiện lần đăng nhập đầu tiên từ thiết bị mới
      Vui lòng nhập mã OTP để xác thực thiết bị này.`

      this.mailService.generateAndSendOtp(email, template, content, bodyContent)

      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        data: {
          type: TypeOfVerificationCode.LOGIN
        },
        message:
          'Đây là lần đăng nhập đầu tiên từ thiết bị này. Vui lòng kiểm tra email để xác thực.'
      }
    }
    // neu la thiet bi da co
    //thi thoi
    return {
      statusCode: HttpStatus.CREATED,
      data: {
        type: TypeOfVerificationCode.LOGIN
      },
      message: 'Thiết bị đã được xác thực trước đó.'
    }
  }

  async verifyOTP(
    body: { email: string; code: string; type: string },
    userAgent: string,
    ip: string
  ) {
    try {
      const { email, code, type } = body
      const storedOtp = await this.redisClient.get(email)
      console.log(type)

      if (storedOtp === code) {
        // Xóa OTP sau khi xác thực thành công
        await this.redisClient.del(email)
        this.logger.log(`OTP verified and deleted for ${email}`)

        // neu type === 'login' thi tao device
        if (type === TypeOfVerificationCode.LOGIN) {
          const user = await this.sharedUserRepository.findUnique({ email })
          if (!user) {
            throw EmailNotFoundException
          }
          await this.createUserDevice(user.id, userAgent, ip)
        } else if (type === TypeOfVerificationCode.FORGOT_PASSWORD) {
          return await this.verifyForgotPasswordByAction(email, userAgent, ip)
        } else if (type === TypeOfVerificationCode.CHANGE_PASSWORD) {
        }
        return {
          data: null,
          message: 'Xác thực OTP thành công'
        }
      }
      //

      throw new BadRequestException('Mã OTP không hợp lệ hoặc đã hết hạn')
    } catch (error) {
      this.logger.error(`Failed to verify OTP for ${body.email}: ${error.message}`)
      throw error
    }
  }

  async createUserDevice(userId: number, userAgent: string, ip: string) {
    const device = await this.authRepository.createDevice({
      userId,
      userAgent,
      ip,
      deviceToken: uuidv4()
    })
    return device
  }

  async verifyForgotPasswordByAction(email: string, userAgent: string, ip: string) {
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.sharedUserRepository.findUniqueIncludeRole({
      email
    })
    if (!user) {
      throw InvalidOTPExceptionForEmail
    }

    // 2. Xóa tất cả refreshToken và device cũ của user
    await Promise.all([
      this.authRepository.deleteManyRefreshTokenByUserId({ userId: user.id }),
      this.authRepository.deleteManyDeviceByUserId({ userId: user.id })
    ])

    // thành công hết thì: send token va gui mail
    const device = await this.authRepository.createDevice({
      userId: user.id,
      userAgent: userAgent,

      ip: ip,
      deviceToken: uuidv4()
    })
    const accessToken = await this.tokenService.signAccessToken({
      userId: user.id,
      deviceId: device.id,
      roleId: user.roleId,
      roleName: user.role.name
    })

    const data = {
      accessToken
    }

    return {
      data,
      message: AUTH_MESSAGE.VERIFY_OTP_FORGOT_PASSWORD_SUCCESS
    }
  }
}
