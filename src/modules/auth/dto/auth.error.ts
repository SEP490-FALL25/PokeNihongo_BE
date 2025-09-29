import { AUTH_MESSAGE } from '@/common/constants/message'
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException
} from '@nestjs/common'

// OTP related errors
export const InvalidOTPException = new UnauthorizedException(AUTH_MESSAGE.INVALID_OTP)

export const OTPExpiredException = new UnauthorizedException(AUTH_MESSAGE.OTP_EXPIRED)

export const FailedToSendOTPException = new BadRequestException(
  AUTH_MESSAGE.FAILED_TO_SEND_OTP
)

// Email related errors
export const EmailAlreadyExistsException = new UnprocessableEntityException(
  AUTH_MESSAGE.EMAIL_ALREADY_EXISTS
)

export const EmailNotFoundException = new NotFoundException(AUTH_MESSAGE.NOT_FOUND_EMAIL)

export const EmailAlreadyActiveException = new NotFoundException(
  AUTH_MESSAGE.EMAIL_ACTIVE
)

export const FailToLoginException = new NotFoundException('Sai email hoặc mật khẩu')

export const InvalidOTPExceptionForEmail = new UnauthorizedException(
  AUTH_MESSAGE.INVALID_OTP
)

// Auth token related errors
export const RefreshTokenAlreadyUsedException = new UnauthorizedException(
  AUTH_MESSAGE.REFRESH_TOKEN_ALREADY_USED
)
export const UnauthorizedAccessException = new UnauthorizedException(
  AUTH_MESSAGE.UNAUTHORIZED_ACCESS
)

export const AccountIsBanned = new UnauthorizedException(AUTH_MESSAGE.ACCOUNT_IS_BANNED)

export const UnVeryfiedAccountException = new UnauthorizedException(
  'Tài khoản chưa được xác thực, vui lòng kiểm tra email để xác thực tài khoản'
)

// Google auth related errors
export const GoogleUserInfoError = new Error(AUTH_MESSAGE.FAILD_TO_GET_GOOGLE_USER_INFO)

export const InvalidTOTPException = new UnprocessableEntityException([
  {
    message: 'Error.InvalidTOTP',
    path: 'totpCode'
  }
])

export const TOTPAlreadyEnabledException = new UnprocessableEntityException([
  {
    message: 'Error.TOTPAlreadyEnabled',
    path: 'totpCode'
  }
])

export const TOTPNotEnabledException = new UnprocessableEntityException([
  {
    message: 'Error.TOTPNotEnabled',
    path: 'totpCode'
  }
])

export const InvalidTOTPAndCodeException = new UnprocessableEntityException([
  {
    message: 'Error.InvalidTOTPAndCode',
    path: 'totpCode'
  },
  {
    message: 'Error.InvalidTOTPAndCode',
    path: 'code'
  }
])
