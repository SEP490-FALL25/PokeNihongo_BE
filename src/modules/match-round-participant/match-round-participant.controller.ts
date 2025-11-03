import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateMatchRoundParticipantBodyDTO,
  CreateMatchRoundParticipantResDTO,
  GetMatchRoundParticipantDetailResDTO,
  GetMatchRoundParticipantParamsDTO,
  UpdateMatchRoundParticipantBodyDTO,
  UpdateMatchRoundParticipantResDTO
} from './dto/match-round-participant.dto'
import { MatchRoundParticipantService } from './match-round-participant.service'

@Controller('match-round-participant')
export class MatchRoundParticipantController {
  constructor(
    private readonly matchRoundParticipantService: MatchRoundParticipantService
  ) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.matchRoundParticipantService.list(query, lang)
  }

  @Get(':matchRoundParticipantId')
  @ZodSerializerDto(GetMatchRoundParticipantDetailResDTO)
  findById(
    @Param() params: GetMatchRoundParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchRoundParticipantService.findById(
      params.matchRoundParticipantId,
      lang
    )
  }

  @Post()
  @ZodSerializerDto(CreateMatchRoundParticipantResDTO)
  create(
    @Body() body: CreateMatchRoundParticipantBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchRoundParticipantService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':matchRoundParticipantId')
  @ZodSerializerDto(UpdateMatchRoundParticipantResDTO)
  update(
    @Body() body: UpdateMatchRoundParticipantBodyDTO,
    @Param() params: GetMatchRoundParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchRoundParticipantService.update(
      {
        data: body,
        id: params.matchRoundParticipantId,
        userId
      },
      lang
    )
  }

  @Delete(':matchRoundParticipantId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetMatchRoundParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchRoundParticipantService.delete(
      {
        id: params.matchRoundParticipantId,
        userId
      },
      lang
    )
  }
}
