import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateGeminiConfigBodyDTO,
  CreateGeminiConfigResDTO,
  GetGeminiConfigResDTO,
  GetParamsGeminiConfigDTO,
  UpdateGeminiConfigBodyDTO,
  UpdateGeminiConfigResDTO
} from 'src/modules/gemini-config/dto/gemini-config.zod-dto'
import { GeminiConfigType } from '@prisma/client'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { MessageResDTO } from 'src/shared/dtos/response.dto'
import { GeminiConfigService } from './gemini-config.service'

@Controller('gemini-config')
@ApiBearerAuth()
export class GeminiConfigController {
  constructor(private readonly geminiConfigService: GeminiConfigService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.geminiConfigService.list(query, lang)
  }

  @Get('type/:configType')
  @ZodSerializerDto(GetGeminiConfigResDTO)
  findByConfigType(
    @Param('configType') configType: GeminiConfigType,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.findByConfigType(configType, lang)
  }

  @Get(':geminiConfigId')
  @ZodSerializerDto(GetGeminiConfigResDTO)
  findById(@Param() params: GetParamsGeminiConfigDTO, @I18nLang() lang: string) {
    return this.geminiConfigService.findById(params.geminiConfigId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateGeminiConfigResDTO)
  create(
    @Body() body: CreateGeminiConfigBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':geminiConfigId')
  @ZodSerializerDto(UpdateGeminiConfigResDTO)
  update(
    @Body() body: UpdateGeminiConfigBodyDTO,
    @Param() params: GetParamsGeminiConfigDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.update(
      {
        data: body,
        id: params.geminiConfigId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':geminiConfigId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetParamsGeminiConfigDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.geminiConfigService.delete(
      {
        id: params.geminiConfigId,
        deletedById: userId
      },
      lang
    )
  }
}

