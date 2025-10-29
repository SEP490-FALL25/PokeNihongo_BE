import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateShopPurchaseBodyDTO,
  CreateShopPurchaseResDTO,
  GetShopPurchaseDetailResDTO,
  GetShopPurchaseListResDTO,
  GetShopPurchaseParamsDTO,
  UpdateShopPurchaseBodyDTO,
  UpdateShopPurchaseResDTO
} from './dto/gacha-purchase.dto'
import { ShopPurchaseService } from './shop-purchase.service'

@Controller('shop-purchase')
export class ShopPurchaseController {
  constructor(private readonly shopPurchaseService: ShopPurchaseService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.shopPurchaseService.list(query, lang)
  }

  @Get('user')
  @ZodSerializerDto(GetShopPurchaseListResDTO)
  getByUser(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.shopPurchaseService.getByUser(userId, lang)
  }

  @Get(':shopPurchaseId')
  @ZodSerializerDto(GetShopPurchaseDetailResDTO)
  findById(
    @Param() params: GetShopPurchaseParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopPurchaseService.findById(params.shopPurchaseId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateShopPurchaseResDTO)
  create(
    @Body() body: CreateShopPurchaseBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopPurchaseService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':shopPurchaseId')
  @ZodSerializerDto(UpdateShopPurchaseResDTO)
  update(
    @Body() body: UpdateShopPurchaseBodyDTO,
    @Param() params: GetShopPurchaseParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopPurchaseService.update(
      {
        data: body,
        id: params.shopPurchaseId,
        userId
      },
      lang
    )
  }

  @Delete(':shopPurchaseId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetShopPurchaseParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopPurchaseService.delete(
      {
        id: params.shopPurchaseId,
        userId
      },
      lang
    )
  }
}
