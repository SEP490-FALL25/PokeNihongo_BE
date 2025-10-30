import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateUserGachaPityBodyDTO,
  CreateUserGachaPityResDTO,
  GetUserGachaPityDetailResDTO,
  GetUserGachaPityParamsDTO,
  UpdateUserGachaPityBodyDTO,
  UpdateUserGachaPityResDTO
} from './dto/user-gacha-pity.dto'
import { UserGachaPityService } from './user-gacha-pity.service'

@Controller('user-gacha-pity')
export class UserGachaPityController {
  constructor(private readonly userGachaPityService: UserGachaPityService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.userGachaPityService.list(query, lang)
  }

  @Get('user/present')
  @ZodSerializerDto(GetUserGachaPityDetailResDTO)
  getUserPityNow(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.userGachaPityService.getUserPityNow(userId, lang)
  }

  @Get(':userGachaPityId')
  @ZodSerializerDto(GetUserGachaPityDetailResDTO)
  findById(
    @Param() params: GetUserGachaPityParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userGachaPityService.findById(params.userGachaPityId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateUserGachaPityResDTO)
  create(
    @Body() body: CreateUserGachaPityBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userGachaPityService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':userGachaPityId')
  @ZodSerializerDto(UpdateUserGachaPityResDTO)
  update(
    @Body() body: UpdateUserGachaPityBodyDTO,
    @Param() params: GetUserGachaPityParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userGachaPityService.update(
      {
        data: body,
        id: params.userGachaPityId,
        userId
      },
      lang
    )
  }

  @Delete(':userGachaPityId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetUserGachaPityParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userGachaPityService.delete(
      {
        id: params.userGachaPityId,
        userId
      },
      lang
    )
  }
}
