import { IsPublic } from '@/common/decorators/auth.decorator'
import { ResponseMessage } from '@/common/decorators/custom'
import { Controller, Post, Query } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger'
import { MailService } from './mail.service'

@Controller('mail')
@ApiTags('Mail')
@ApiBearerAuth('access-token')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @IsPublic()
  @Post('send-otp')
  @ApiOperation({ summary: 'Gửi mã OTP qua email' })
  @ApiResponse({ status: 200, description: 'Đã gửi mã OTP thành công' })
  @ResponseMessage('Đã gửi mã OTP thành công')
  @ApiQuery({
    name: 'email',
    required: true,
    type: String,
    description: 'Email nhận mã OTP'
  })
  async sendOtp(@Query('email') email: string) {
    const emailLower = email.toLowerCase()
    const template = 'otp'
    const content = 'Mã OTP của bạn là: '
    const body = 'Vui lòng nhập mã OTP để xác thực tài khoản của bạn.'
    return await this.mailService.generateAndSendOtp(emailLower, template, content, body)
  }

  @IsPublic()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Xác thực mã OTP' })
  @ApiResponse({ status: 200, description: 'Xác thực mã OTP thành công' })
  @ResponseMessage('Xác thực mã OTP thành công')
  @ApiQuery({
    name: 'otp',
    required: true,
    type: String,
    description: 'Mã OTP cần xác thực'
  })
  @ApiQuery({
    name: 'email',
    required: true,
    type: String,
    description: 'Email đã nhận mã OTP'
  })
  async verifyOtpController(@Query('email') email: string, @Query('otp') otp: string) {
    return await this.mailService.verifyOtpStrict(email, otp)
  }
}
