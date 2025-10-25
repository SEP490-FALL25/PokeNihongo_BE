import { AttendanceMessage } from '@/i18n/message-keys'
import { ConflictException } from '@nestjs/common'

export class AttendancegAlreadyExistsException extends ConflictException {
  constructor() {
    super({
      message: AttendanceMessage.CHECKIN_ALREADY,
      errorKey: AttendanceMessage.CHECKIN_ALREADY
    })
  }
}
