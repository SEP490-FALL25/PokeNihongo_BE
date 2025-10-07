import { SYSTEM_MESSAGE } from '@/common/constants/message'
import { AuthMessage, SystemMessage } from '@/i18n/message-keys'
import {
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException
} from '@nestjs/common'

export class NotFoundRecordException extends NotFoundException {
  constructor() {
    super({
      message: 'Không tìm thấy bản ghi',
      errorKey: SystemMessage.NOT_FOUND
    })
  }
}

export class InvalidPasswordException extends UnauthorizedException {
  constructor() {
    super({
      message: SYSTEM_MESSAGE.INVALID_PASSWORD,
      errorKey: SystemMessage.INVALID_PASSWORD
    })
  }
}

export class InvalidOldPasswordException extends UnauthorizedException {
  constructor() {
    super({
      message: 'Sai mật khẩu cũ',
      errorKey: AuthMessage.INVALID_OLD_PASSWORD
    })
  }
}

export class InValidNewPasswordAndConfirmPasswordException extends UnprocessableEntityException {
  constructor() {
    super({
      message: 'Sai mật khẩu hoặc xác nhận mật khẩu',
      errorKey: AuthMessage.INVALID_NEW_PASSWORD_CONFIRM_PASSWORD
    })
  }
}

export class InValidNewPasswordAndConfirmPasswordRegisterException extends UnprocessableEntityException {
  constructor() {
    super({
      message: 'Sai mật khẩu hoặc xác nhận mật khẩu',
      errorKey: AuthMessage.INVALID_NEW_PASSWORD_CONFIRM_PASSWORD_REGISTER
    })
  }
}
