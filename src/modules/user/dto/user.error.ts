import { USER_MESSAGE } from '@/common/constants/message'
import { BadRequestException, NotFoundException } from '@nestjs/common'

export const UserNotFoundException = new NotFoundException(USER_MESSAGE.NOT_FOUND)

export const EmailAlreadyExistsException = new BadRequestException(
  USER_MESSAGE.EMAIL_ALREADY_EXISTS
)
