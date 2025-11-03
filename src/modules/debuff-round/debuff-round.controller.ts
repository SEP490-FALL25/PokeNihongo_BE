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
import { DebuffRoundService } from './debuff-round.service'
import {
  CreatedDebuffRoundBodyInputDTO,
  CreateDebuffRoundResDTO,
  GetDebuffRoundDetailResDTO,
  GetDebuffRoundParamsDTO,
  UpdateDebuffRoundBodyInputDTO,
  UpdateDebuffRoundResDTO
} from './dto/debuff-round.zod-dto'

@Controller('debuff-round')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class DebuffRoundController {
  constructor(private readonly debuffRoundService: DebuffRoundService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.debuffRoundService.list(query, lang)
  }

  @Post()
  @ZodSerializerDto(CreateDebuffRoundResDTO)
  create(
    @Body() body: CreatedDebuffRoundBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.debuffRoundService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Get(':debuffRoundId')
  @IsPublic()
  @ZodSerializerDto(GetDebuffRoundDetailResDTO)
  findById(@Param() params: GetDebuffRoundParamsDTO, @I18nLang() lang: string) {
    return this.debuffRoundService.findById(params.debuffRoundId, lang)
  }

  @Put(':debuffRoundId')
  @ZodSerializerDto(UpdateDebuffRoundResDTO)
  update(
    @Body() body: UpdateDebuffRoundBodyInputDTO,
    @Param() params: GetDebuffRoundParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.debuffRoundService.update(
      {
        data: body,
        id: params.debuffRoundId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':debuffRoundId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetDebuffRoundParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.debuffRoundService.delete(
      {
        id: params.debuffRoundId,
        deletedById: userId
      },
      lang
    )
  }
}
