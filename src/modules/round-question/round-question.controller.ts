import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  AnswerQuestionBodyDTO,
  CreateRoundQuestionBodyDTO,
  CreateRoundQuestionResDTO,
  GetRoundQuestionDetailResDTO,
  GetRoundQuestionParamsDTO,
  UpdateRoundQuestionBodyDTO,
  UpdateRoundQuestionResDTO
} from './dto/round-question.dto'
import { RoundQuestionService } from './round-question.service'

@Controller('round-question')
export class RoundQuestionController {
  constructor(private readonly roundQuestionService: RoundQuestionService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.roundQuestionService.list(query, lang)
  }

  @Get(':roundQuestionId')
  @ZodSerializerDto(GetRoundQuestionDetailResDTO)
  findById(
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roundQuestionService.findById(params.roundQuestionId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateRoundQuestionResDTO)
  create(
    @Body() body: CreateRoundQuestionBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roundQuestionService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put('answer/:roundQuestionId')
  answerQuestion(
    @Body() body: AnswerQuestionBodyDTO,
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roundQuestionService.answerQuestion(
      {
        data: body,
        id: params.roundQuestionId,
        userId
      },
      lang
    )
  }

  @Put(':roundQuestionId')
  @ZodSerializerDto(UpdateRoundQuestionResDTO)
  update(
    @Body() body: UpdateRoundQuestionBodyDTO,
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roundQuestionService.update(
      {
        data: body,
        id: params.roundQuestionId,
        userId
      },
      lang
    )
  }

  @Delete(':roundQuestionId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetRoundQuestionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roundQuestionService.delete(
      {
        id: params.roundQuestionId,
        userId
      },
      lang
    )
  }
}
