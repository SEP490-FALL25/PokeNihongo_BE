import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateShopRarityPriceBodyDTO,
  CreateShopRarityPriceResDTO,
  GetShopRarityPriceDetailResDTO,
  GetShopRarityPriceParamsDTO,
  UpdateShopRarityPriceBodyDTO,
  UpdateShopRarityPriceResDTO,
  UpdateWithListShopRarityPriceBodyDTO,
  UpdateWithListItemResDTO
} from './dto/shop-rarity-price.dto'
import { ShopRarityPriceService } from './shop-rarity-price.service'

@Controller('shop-rarity-price')
export class ShopRarityPriceController {
  constructor(private readonly shopRarityPriceService: ShopRarityPriceService) { }

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.shopRarityPriceService.list(query, lang)
  }

  @Get(':shopRarityPriceId')
  @ZodSerializerDto(GetShopRarityPriceDetailResDTO)
  findById(
    @Param() params: GetShopRarityPriceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopRarityPriceService.findById(params.shopRarityPriceId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateShopRarityPriceResDTO)
  create(
    @Body() body: CreateShopRarityPriceBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopRarityPriceService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put()
  @ZodSerializerDto(UpdateWithListShopRarityPriceBodyDTO)
  updateByList(
    @Body() body: UpdateWithListShopRarityPriceBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopRarityPriceService.updateByList(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':shopRarityPriceId')
  @ZodSerializerDto(UpdateShopRarityPriceResDTO)
  update(
    @Body() body: UpdateShopRarityPriceBodyDTO,
    @Param() params: GetShopRarityPriceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopRarityPriceService.update(
      {
        data: body,
        id: params.shopRarityPriceId,
        userId
      },
      lang
    )
  }

  @Delete(':shopRarityPriceId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetShopRarityPriceParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopRarityPriceService.delete(
      {
        id: params.shopRarityPriceId,
        userId
      },
      lang
    )
  }
}
