import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreatedRewardBodyInputDTO,
  CreateRewardResDTO,
  GetRewardDetailResDTO,
  GetRewardParamsDTO,
  UpdateRewardBodyInputDTO,
  UpdateRewardResDTO
} from './dto/reward.zod-dto'
import { RewardService } from './reward.service'

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
    @Body() body: CreatedRewardBodyInputDTO,
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
    @Body() body: UpdateRewardBodyInputDTO,
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
