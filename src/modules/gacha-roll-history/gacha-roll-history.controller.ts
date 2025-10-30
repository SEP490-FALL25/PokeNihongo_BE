import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateGachaRollHistoryBodyDTO,
  CreateGachaRollHistoryResDTO,
  GetGachaRollHistoryDetailResDTO,
  GetGachaRollHistoryParamsDTO,
  UpdateGachaRollHistoryBodyDTO,
  UpdateGachaRollHistoryResDTO
} from './dto/gacha-roll-history.dto'
import { GachaRollHistoryService } from './gacha-roll-history.service'

@Controller('gacha-roll-history')
export class GachaRollHistoryController {
  constructor(private readonly gachaRollHistoryService: GachaRollHistoryService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.gachaRollHistoryService.list(query, lang)
  }

  @Get(':gachaRollHistoryId')
  @ZodSerializerDto(GetGachaRollHistoryDetailResDTO)
  findById(
    @Param() params: GetGachaRollHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaRollHistoryService.findById(params.gachaRollHistoryId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateGachaRollHistoryResDTO)
  create(
    @Body() body: CreateGachaRollHistoryBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaRollHistoryService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':gachaRollHistoryId')
  @ZodSerializerDto(UpdateGachaRollHistoryResDTO)
  update(
    @Body() body: UpdateGachaRollHistoryBodyDTO,
    @Param() params: GetGachaRollHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaRollHistoryService.update(
      {
        data: body,
        id: params.gachaRollHistoryId,
        userId
      },
      lang
    )
  }

  @Delete(':gachaRollHistoryId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetGachaRollHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaRollHistoryService.delete(
      {
        id: params.gachaRollHistoryId,
        userId
      },
      lang
    )
  }
}
