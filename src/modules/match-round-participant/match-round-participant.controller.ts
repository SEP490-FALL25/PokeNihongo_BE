import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateMatchParticipantBodyDTO,
  CreateMatchParticipantResDTO,
  GetMatchParticipantDetailResDTO,
  GetMatchParticipantParamsDTO,
  UpdateMatchParticipantBodyDTO,
  UpdateMatchParticipantResDTO
} from './dto/match-round-participant.dto'
import { MatchParticipantService } from './match-participant.service'

@Controller('match-participant')
export class MatchParticipantController {
  constructor(private readonly matchParticipantService: MatchParticipantService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.matchParticipantService.list(query, lang)
  }

  @Get(':matchParticipantId')
  @ZodSerializerDto(GetMatchParticipantDetailResDTO)
  findById(
    @Param() params: GetMatchParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchParticipantService.findById(params.matchParticipantId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateMatchParticipantResDTO)
  create(
    @Body() body: CreateMatchParticipantBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchParticipantService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':matchParticipantId')
  @ZodSerializerDto(UpdateMatchParticipantResDTO)
  update(
    @Body() body: UpdateMatchParticipantBodyDTO,
    @Param() params: GetMatchParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchParticipantService.update(
      {
        data: body,
        id: params.matchParticipantId,
        userId
      },
      lang
    )
  }

  @Delete(':matchParticipantId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetMatchParticipantParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.matchParticipantService.delete(
      {
        id: params.matchParticipantId,
        userId
      },
      lang
    )
  }
}
