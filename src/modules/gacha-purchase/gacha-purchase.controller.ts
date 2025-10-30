import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateGachaPurchaseBodyDTO,
  CreateGachaPurchaseResDTO,
  GetGachaPurchaseDetailResDTO,
  GetGachaPurchaseListResDTO,
  GetGachaPurchaseParamsDTO
} from './dto/gacha-purchase.dto'
import { GachaPurchaseService } from './gacha-purchase.service'

@Controller('gacha-purchase')
export class GachaPurchaseController {
  constructor(private readonly gachaPurchaseService: GachaPurchaseService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.gachaPurchaseService.list(query, lang)
  }

  @Get('user')
  @ZodSerializerDto(GetGachaPurchaseListResDTO)
  getByUser(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.gachaPurchaseService.getByUser(userId, lang)
  }

  @Get(':gachaPurchaseId')
  @ZodSerializerDto(GetGachaPurchaseDetailResDTO)
  findById(
    @Param() params: GetGachaPurchaseParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaPurchaseService.findById(params.gachaPurchaseId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateGachaPurchaseResDTO)
  create(
    @Body() body: CreateGachaPurchaseBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaPurchaseService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  // @Put(':gachaPurchaseId')
  // @ZodSerializerDto(UpdateGachaPurchaseResDTO)
  // update(
  //   @Body() body: UpdateGachaPurchaseBodyDTO,
  //   @Param() params: GetGachaPurchaseParamsDTO,
  //   @ActiveUser('userId') userId: number,
  //   @I18nLang() lang: string
  // ) {
  //   return this.gachaPurchaseService.update(
  //     {
  //       data: body,
  //       id: params.gachaPurchaseId,
  //       userId
  //     },
  //     lang
  //   )
  // }

  @Delete(':gachaPurchaseId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetGachaPurchaseParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.gachaPurchaseService.delete(
      {
        id: params.gachaPurchaseId,
        userId
      },
      lang
    )
  }
}
