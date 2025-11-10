import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateUserSeasonHistoryResDTO,
  GetUserSeasonHistoryDetailResDTO,
  GetUserSeasonHistoryParamsDTO,
  UpdateUserSeasonHistoryBodyDTO,
  UpdateUserSeasonHistoryResDTO
} from './dto/user-season-history.dto'
import { UserSeasonHistoryService } from './user-season-history.service'

@Controller('user-season-history')
export class UserSeasonHistoryController {
  constructor(private readonly userSeasonHistoryService: UserSeasonHistoryService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.userSeasonHistoryService.list(query, lang)
  }

  @Get('user/now')
  @ZodSerializerDto(GetUserSeasonHistoryDetailResDTO)
  getUserHisNow(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.userSeasonHistoryService.getUserHisByUserId(userId, lang)
  }

  @Get(':userSeasonHistoryId')
  @ZodSerializerDto(GetUserSeasonHistoryDetailResDTO)
  findById(
    @Param() params: GetUserSeasonHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userSeasonHistoryService.findById(params.userSeasonHistoryId, lang)
  }
  @Post('join')
  @ZodSerializerDto(CreateUserSeasonHistoryResDTO)
  joinSeason(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.userSeasonHistoryService.joinSeason(
      {
        userId
      },
      lang
    )
  }

  @Put(':userSeasonHistoryId')
  @ZodSerializerDto(UpdateUserSeasonHistoryResDTO)
  update(
    @Body() body: UpdateUserSeasonHistoryBodyDTO,
    @Param() params: GetUserSeasonHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userSeasonHistoryService.update(
      {
        data: body,
        id: params.userSeasonHistoryId,
        userId
      },
      lang
    )
  }

  @Delete(':userSeasonHistoryId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetUserSeasonHistoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userSeasonHistoryService.delete(
      {
        id: params.userSeasonHistoryId,
        userId
      },
      lang
    )
  }
}
