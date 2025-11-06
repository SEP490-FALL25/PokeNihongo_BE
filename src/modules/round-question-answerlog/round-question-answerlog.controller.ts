import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateRoundQuestionsAnswerLogBodyDTO,
  CreateRoundQuestionsAnswerLogResDTO,
  GetRoundQuestionsAnswerLogDetailResDTO,
  GetRoundQuestionsAnswerLogParamsDTO,
  UpdateRoundQuestionsAnswerLogBodyDTO,
  UpdateRoundQuestionsAnswerLogResDTO
} from './dto/round-question-answerlog.dto'
import { RoundQuestionsAnswerLogService } from './round-question-answerlog.service'

@Controller('round-question-answerlog')
export class RoundQuestionsAnswerLogController {
  constructor(private readonly roundQuestionService: RoundQuestionsAnswerLogService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.roundQuestionService.list(query, lang)
  }

  @Get(':roundQuestionsAnswerLogId')
  @ZodSerializerDto(GetRoundQuestionsAnswerLogDetailResDTO)
  findById(
    @Param() params: GetRoundQuestionsAnswerLogParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roundQuestionService.findById(params.roundQuestionsAnswerLogId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateRoundQuestionsAnswerLogResDTO)
  create(
    @Body() body: CreateRoundQuestionsAnswerLogBodyDTO,
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

  @Put(':roundQuestionsAnswerLogId')
  @ZodSerializerDto(UpdateRoundQuestionsAnswerLogResDTO)
  update(
    @Body() body: UpdateRoundQuestionsAnswerLogBodyDTO,
    @Param() params: GetRoundQuestionsAnswerLogParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roundQuestionService.update(
      {
        data: body,
        id: params.roundQuestionsAnswerLogId,
        userId
      },
      lang
    )
  }

  @Delete(':roundQuestionsAnswerLogId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetRoundQuestionsAnswerLogParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roundQuestionService.delete(
      {
        id: params.roundQuestionsAnswerLogId,
        userId
      },
      lang
    )
  }
}
