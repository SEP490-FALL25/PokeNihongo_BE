import {
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException
} from '@nestjs/common'

export const NotFoundRecordException = new NotFoundException('Error.NotFound')

export const InvalidPasswordException = new UnauthorizedException('Sai mật khẩu')

export const InvalidOldPasswordException = new UnauthorizedException(
  'Mật khẩu cũ không đúng'
)
export const InValidNewPasswordAndConfirmPasswordException =
  new UnprocessableEntityException('Mật khẩu mới và mật khẩu xác nhận không khớp')
