import { SYSTEM_MESSAGE } from '@/common/constants/message'
import {
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException
} from '@nestjs/common'

export const NotFoundRecordException = new NotFoundException(SYSTEM_MESSAGE.NOT_FOUND)

export const InvalidPasswordException = new UnauthorizedException(
  SYSTEM_MESSAGE.INVALID_PASSWORD
)

export const InvalidOldPasswordException = new UnauthorizedException(
  SYSTEM_MESSAGE.INVALID_OLD_PASSWORD
)
export const InValidNewPasswordAndConfirmPasswordException =
  new UnprocessableEntityException(SYSTEM_MESSAGE.INVALID_NEW_PASSWORD_CONFIRM_PASSWORD)
