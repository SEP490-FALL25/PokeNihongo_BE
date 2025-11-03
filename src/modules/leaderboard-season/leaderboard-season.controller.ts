import { ActiveUser } from '@/common/decorators/active-user.decorator'
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
  CreatedLeaderboardSeasonBodyInputDTO,
  CreateLeaderboardSeasonResDTO,
  GetLeaderboardSeasonDetailResDTO,
  GetLeaderboardSeasonParamsDTO,
  UpdateLeaderboardSeasonBodyInputDTO,
  UpdateLeaderboardSeasonResDTO
} from './dto/leaderboard-season.zod-dto'
import { LeaderboardSeasonService } from './leaderboard-season.service'

@Controller('leaderboard-season')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class LeaderboardSeasonController {
  constructor(private readonly leaderboardSeasonService: LeaderboardSeasonService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.leaderboardSeasonService.list(query, lang, roleName)
  }

  @Post()
  @ZodSerializerDto(CreateLeaderboardSeasonResDTO)
  create(
    @Body() body: CreatedLeaderboardSeasonBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.leaderboardSeasonService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Get(':leaderboardSeasonId')
  @ZodSerializerDto(GetLeaderboardSeasonDetailResDTO)
  findById(
    @Param() params: GetLeaderboardSeasonParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.leaderboardSeasonService.findById(
      params.leaderboardSeasonId,
      roleName,
      lang
    )
  }

  @Put(':leaderboardSeasonId')
  @ZodSerializerDto(UpdateLeaderboardSeasonResDTO)
  update(
    @Body() body: UpdateLeaderboardSeasonBodyInputDTO,
    @Param() params: GetLeaderboardSeasonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.leaderboardSeasonService.update(
      {
        data: body,
        id: params.leaderboardSeasonId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':leaderboardSeasonId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetLeaderboardSeasonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.leaderboardSeasonService.delete(
      {
        id: params.leaderboardSeasonId,
        deletedById: userId
      },
      lang
    )
  }
}
