import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreatedRewardBodyDTO,
  CreateRewardResDTO,
  GetRewardDetailResDTO,
  GetRewardParamsDTO,
  UpdateRewardBodyDTO,
  UpdateRewardResDTO
} from './dto/reward.zod-dto'
import { RewardService } from './reward.service'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { ApiBearerAuth } from '@nestjs/swagger'

@Controller('reward')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.rewardService.list(query, lang)
  }

  @Get(':rewardId')
  @IsPublic()
  @ZodSerializerDto(GetRewardDetailResDTO)
  findById(@Param() params: GetRewardParamsDTO, @I18nLang() lang: string) {
    return this.rewardService.findById(params.rewardId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateRewardResDTO)
  create(
    @Body() body: CreatedRewardBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.rewardService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':rewardId')
  @ZodSerializerDto(UpdateRewardResDTO)
  update(
    @Body() body: UpdateRewardBodyDTO,
    @Param() params: GetRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.rewardService.update(
      {
        data: body,
        id: params.rewardId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':rewardId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetRewardParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.rewardService.delete(
      {
        id: params.rewardId,
        deletedById: userId
      },
      lang
    )
  }
}
