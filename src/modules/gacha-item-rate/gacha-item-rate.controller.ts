import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateGachaItemRateBodyDTO,
  CreateGachaItemRateResDTO,
  GetGachaItemRateDetailResDTO,
  GetGachaItemRateParamsDTO,
  UpdateGachaItemRateBodyDTO,
  UpdateGachaItemRateResDTO
} from './dto/gacha-item-rate.dto'
import { GachaItemRateService } from './gacha-item-rate.service'

@Controller('gacha-item-rate')
export class GachaItemRateController {
  constructor(private readonly gachaItemRateService: GachaItemRateService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.gachaItemRateService.list(query, lang)
  }

  @Get(':gachaItemRateId')
  @ZodSerializerDto(GetGachaItemRateDetailResDTO)
  findById(
    @Param() params: GetGachaItemRateParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaItemRateService.findById(params.gachaItemRateId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateGachaItemRateResDTO)
  create(
    @Body() body: CreateGachaItemRateBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaItemRateService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':gachaItemRateId')
  @ZodSerializerDto(UpdateGachaItemRateResDTO)
  update(
    @Body() body: UpdateGachaItemRateBodyDTO,
    @Param() params: GetGachaItemRateParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaItemRateService.update(
      {
        data: body,
        id: params.gachaItemRateId,
        userId
      },
      lang
    )
  }

  @Delete(':gachaItemRateId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetGachaItemRateParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaItemRateService.delete(
      {
        id: params.gachaItemRateId,
        userId
      },
      lang
    )
  }
}
