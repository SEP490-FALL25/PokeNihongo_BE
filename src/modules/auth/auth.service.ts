import { BullQueueService } from '@/3rdService/bull/bull-queue.service'
import { MailService } from '@/3rdService/mail/mail.service'
import { TypeOfVerificationCodeType, UserStatus } from '@/common/constants/auth.constant'
import { AUTH_MESSAGE } from '@/common/constants/message'
import { AuthRepository } from '@/modules/auth/auth.repo'
import {
  EmailAlreadyExistsException,
  EmailNotFoundException,
  FailToLoginException,
  InvalidOTPException,
  InvalidOTPExceptionForEmail,
  OTPExpiredException,
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
import { HttpException, Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'

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
    private readonly tokenService: TokenService
  ) {}

  async validateVerificationCode({
    email,
    code,
    type
  }: {
    email: string
    code: string
    type: TypeOfVerificationCodeType
  }) {
    const vevificationCode = await this.authRepository.findUniqueVerificationCode({
      email_code_type: {
        email,
        code,
        type
      }
    })
    if (!vevificationCode) {
      throw InvalidOTPException
    }
    if (vevificationCode.expiresAt < new Date()) {
      throw OTPExpiredException
    }
    return vevificationCode
  }

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

    // usser verify chua ?
    if (user.status === UserStatus.INACTIVE) {
      this.resendVerifiedEmail(user.email)
      throw UnVeryfiedAccountException
    }
    // 3. Tạo mới device
    const device = await this.authRepository.createDevice({
      userId: user.id,
      userAgent: body.userAgent,
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
      ...tokens
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
      //Todo: sửa lại thành 30 ngày sau khi hoàn thiện chức năng
      // xóa những nhừng user không active sau 5 phút
      // Thêm tác vụ xóa vào hàng đợi
      const jobAdded = await this.bullQueueService.addJob(
        this.deletionQueue,
        'delete-inactive-user',
        { userId: user.id },
        {
          delay: 5 * 60 * 1000,
          attempts: 3,
          backoff: { type: 'fixed', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: true
        }
      )

      if (jobAdded) {
        this.logger.log(`Đã tạo người dùng ID ${user.id} và lập lịch xóa sau 5 phút`)
      } else {
        this.logger.warn(
          `Đã tạo người dùng ID ${user.id} nhưng không thể lập lịch xóa do lỗi Redis`
        )
      }

      // 2. send mail de xác thực
      const emailLower = body.email.toLowerCase()
      const template = 'otp'
      const content = 'XÁC THỰC MAIL CỦA BẠN: '
      const bodyContent = 'Vui lòng nhập nhấn nút XÁC THỰC để xác thực tài khoản của bạn.'
      this.mailService.generateAndSendOtp(emailLower, template, content, bodyContent)

      return {
        data: null,
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
    const bodyContent = 'Vui lòng nhập mã OTP để xác thực tài khoản của bạn.'
    this.mailService.generateAndSendOtp(
      registerEmailLowerCase,
      template,
      content,
      bodyContent
    )
    return {
      data: null,
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

    // thành công hết thì: send token va gui mail
    const device = await this.authRepository.createDevice({
      userId: user.id,
      userAgent: userAgent,
      ip: ip
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

  async resetPassword(body: ResetPasswordBodyType, userId: number) {
    const { newPassword, email, confirmNewPassword } = body
    // 1. Kiểm tra email đã tồn tại trong database chưa
    const user = await this.sharedUserRepository.findUnique({ email })

    if (!user || user.id !== userId) {
      throw EmailNotFoundException
    }

    //check password == password cu
    if (newPassword !== confirmNewPassword) {
      throw InValidNewPasswordAndConfirmPasswordException
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
}
