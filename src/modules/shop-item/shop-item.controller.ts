import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateShopItemBodyDTO,
  CreateShopItemResDTO,
  GetShopItemDetailResDTO,
  GetShopItemParamsDTO,
  UpdateShopItemBodyDTO,
  UpdateShopItemResDTO
} from './dto/shop-item.dto'
import { ShopItemService } from './shop-item.service'

@Controller('shop-item')
export class ShopItemController {
  constructor(private readonly shopItemService: ShopItemService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.shopItemService.list(query, lang)
  }

  @Get(':shopItemId')
  @ZodSerializerDto(GetShopItemDetailResDTO)
  findById(
    @Param() params: GetShopItemParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopItemService.findById(params.shopItemId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateShopItemResDTO)
  create(
    @Body() body: CreateShopItemBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopItemService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':shopItemId')
  @ZodSerializerDto(UpdateShopItemResDTO)
  update(
    @Body() body: UpdateShopItemBodyDTO,
    @Param() params: GetShopItemParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopItemService.update(
      {
        data: body,
        id: params.shopItemId,
        userId
      },
      lang
    )
  }

  @Delete(':shopItemId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetShopItemParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopItemService.delete(
      {
        id: params.shopItemId,
        userId
      },
      lang
    )
  }
}
