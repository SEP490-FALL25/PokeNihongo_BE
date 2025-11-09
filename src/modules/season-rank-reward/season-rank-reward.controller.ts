import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateSeasonRankRewardBodyDTO,
  CreateSeasonRankRewardResDTO,
  GetSeasonRankRewardDetailResDTO,
  GetSeasonRankRewardParamsDTO,
  UpdateSeasonRankRewardBodyDTO,
  UpdateSeasonRankRewardResDTO
} from './dto/season-rank-reward.dto'
import { SeasonRankRewardService } from './season-rank-reward.service'

@Controller('user-season-history')
export class SeasonRankRewardController {
  constructor(private readonly seasonRankRewardService: SeasonRankRewardService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.seasonRankRewardService.list(query, lang)
  }

  @Get(':seasonRankRewardId')
  @ZodSerializerDto(GetSeasonRankRewardDetailResDTO)
  findById(
    @Param() params: GetSeasonRankRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.seasonRankRewardService.findById(params.seasonRankRewardId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateSeasonRankRewardResDTO)
  create(
    @Body() body: CreateSeasonRankRewardBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.seasonRankRewardService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':seasonRankRewardId')
  @ZodSerializerDto(UpdateSeasonRankRewardResDTO)
  update(
    @Body() body: UpdateSeasonRankRewardBodyDTO,
    @Param() params: GetSeasonRankRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.seasonRankRewardService.update(
      {
        data: body,
        id: params.seasonRankRewardId,
        userId
      },
      lang
    )
  }

  @Delete(':seasonRankRewardId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetSeasonRankRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.seasonRankRewardService.delete(
      {
        id: params.seasonRankRewardId,
        userId
      },
      lang
    )
  }
}
