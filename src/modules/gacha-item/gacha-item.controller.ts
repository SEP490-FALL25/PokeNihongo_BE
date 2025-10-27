import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateWithListItemBodyDTO,
  CreateWithListItemResDTO,
  GetGachaItemDetailResDTO,
  GetGachaItemParamsDTO,
  GetRamdomAmountGachaItemsBodyDTO,
  GetRandomGachaItemsResDTO,
  UpdateWithListItemBodyDTO,
  UpdateWithListItemResDTO
} from './dto/gacha-item.dto'
import { GachaItemService } from './gacha-item.service'

@Controller('gacha-item')
export class GachaItemController {
  constructor(private readonly gachaItemService: GachaItemService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.gachaItemService.list(query, lang)
  }

  @Post('random')
  @ZodSerializerDto(GetRandomGachaItemsResDTO)
  getRandomListItem(
    @Body() body: GetRamdomAmountGachaItemsBodyDTO,
    @I18nLang() lang: string
  ) {
    return this.gachaItemService.getRandomListItem(body, lang)
  }

  @Get(':gachaItemId')
  @ZodSerializerDto(GetGachaItemDetailResDTO)
  findById(@Param() params: GetGachaItemParamsDTO, @I18nLang() lang: string) {
    return this.gachaItemService.findById(params.gachaItemId, lang)
  }

  @Post('list')
  @ZodSerializerDto(CreateWithListItemResDTO)
  createByList(
    @Body() body: CreateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaItemService.createByList(userId, body, lang)
  }

  @Put('list')
  @ZodSerializerDto(UpdateWithListItemResDTO)
  updateByList(
    @Body() body: UpdateWithListItemBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaItemService.updateByList(userId, body, lang)
  }

  @Delete(':gachaItemId')
  @ZodSerializerDto(MessageResDTO)
  delete(@Param() params: GetGachaItemParamsDTO, @I18nLang() lang: string) {
    return this.gachaItemService.delete(params.gachaItemId, lang)
  }
}
