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
  CreateMatchRoundBodyDTO,
  GetMatchRoundDetailResDTO,
  GetMatchRoundParamsDTO,
  UpdateMatchRoundBodyDTO,
  UpdateMatchRoundResDTO
} from './dto/match-round.zod-dto'
import { MatchRoundService } from './match-round.service'

@Controller('match-round')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class MatchRoundController {
  constructor(private readonly matchRoundService: MatchRoundService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.matchRoundService.list(query, lang)
  }

  @Get('now/user')
  // @ZodSerializerDto(PaginationResponseSchema)
  getListMatchRoundByUser(
    // @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchRoundService.listNowByUser(userId, lang)
  }

  @Post()
  // @ZodSerializerDto(CreateMatchRoundResDTO)
  create(
    @Body() data: CreateMatchRoundBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchRoundService.create(
      {
        createdById: userId,
        data
      },
      lang
    )
  }

  @Get(':matchRoundId')
  @ZodSerializerDto(GetMatchRoundDetailResDTO)
  findById(@Param() params: GetMatchRoundParamsDTO, @I18nLang() lang: string) {
    return this.matchRoundService.findById(params.matchRoundId, lang)
  }

  @Put(':matchRoundId')
  @ZodSerializerDto(UpdateMatchRoundResDTO)
  update(
    @Body() body: UpdateMatchRoundBodyDTO,
    @Param() params: GetMatchRoundParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchRoundService.update(
      {
        data: body,
        id: params.matchRoundId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':matchRoundId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetMatchRoundParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchRoundService.delete(
      {
        id: params.matchRoundId,
        deletedById: userId
      },
      lang
    )
  }
}
