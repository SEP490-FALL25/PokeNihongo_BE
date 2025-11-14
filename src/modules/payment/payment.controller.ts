import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common'
import { ApiOperation, ApiResponse } from '@nestjs/swagger'
import { CreatePayOSPaymentDto } from './entities/payment.model'
import { PaymentService } from './payment.service'

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('/payos')
  @ApiOperation({ summary: 'Tạo thanh toán PayOS' })
  @ApiResponse({ status: 201, description: 'Tạo link thanh toán thành công' })
  async createPayOSPayment(
    @Body() paymentData: CreatePayOSPaymentDto,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.paymentService.createPayOSPayment(paymentData, userId, lang)
  }

  @Get('/payos/return')
  @IsPublic()
  @ApiOperation({ summary: 'PayOS return URL handler' })
  @ApiResponse({ status: 302, description: 'Redirect về frontend' })
  async handlePayOSReturn(
    @Query('paymentId') paymentId: string,
    @Query('code') code: string,
    @Query('id') paymentLinkId: string,
    @Query('cancel') cancel: string,
    @Query('status') status: string,
    @Query('orderCode') orderCode: string,
    @Res() res: any,
    @I18nLang() lang: string
  ) {
    const result = await this.paymentService.handlePayOSReturn(
      {
        paymentId: parseInt(paymentId),
        code,
        paymentLinkId,
        cancel: cancel === 'true',
        status,
        orderCode: parseInt(orderCode)
      },
      lang
    )

    // Redirect về frontend
    return res.redirect(result.redirect)
  }

  @Get('/payos/cancel')
  @IsPublic()
  @ApiOperation({ summary: 'PayOS cancel URL handler' })
  @ApiResponse({ status: 302, description: 'Redirect về frontend' })
  async handlePayOSCancel(
    @Query('paymentId') paymentId: string,
    @Query('code') code: string,
    @Query('id') paymentLinkId: string,
    @Query('cancel') cancel: string,
    @Query('status') status: string,
    @Query('orderCode') orderCode: string,
    @Res() res: any,
    @I18nLang() lang: string
  ) {
    const result = await this.paymentService.handlePayOSCancel(
      {
        paymentId: parseInt(paymentId),
        code,
        paymentLinkId,
        cancel: cancel === 'true',
        status,
        orderCode: parseInt(orderCode)
      },
      lang
    )
    // Redirect về frontend
    return res.redirect(result.redirect)
  }
}
