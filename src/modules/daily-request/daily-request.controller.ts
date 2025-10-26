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
import { DailyRequestService } from './daily-request.service'
import {
  CreateDailyRequestBodyInputDTO,
  CreateDailyRequestResDTO,
  GetDailyRequestDetailResDTO,
  GetDailyRequestDetailwithAllLangResDTO,
  GetDailyRequestParamsDTO,
  UpdateDailyRequestBodyInputDTO,
  UpdateDailyRequestResDTO
} from './dto/daily-request.zod-dto'

@Controller('daily-request')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class DailyRequestController {
  constructor(private readonly dailyRequestService: DailyRequestService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.dailyRequestService.list(query, lang)
  }

  @Get('admin/:dailyRequestId')
  @IsPublic()
  @ZodSerializerDto(GetDailyRequestDetailwithAllLangResDTO)
  findByIdWithAllLang(
    @Param() params: GetDailyRequestParamsDTO,
    @I18nLang() lang: string
  ) {
    return this.dailyRequestService.findByIdWithAllLang(params.dailyRequestId, lang)
  }

  @Get('admin')
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  getListwithAllLang(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.dailyRequestService.getListwithAllLang(query, lang)
  }

  @Get(':dailyRequestId')
  @IsPublic()
  @ZodSerializerDto(GetDailyRequestDetailResDTO)
  findById(@Param() params: GetDailyRequestParamsDTO, @I18nLang() lang: string) {
    return this.dailyRequestService.findById(params.dailyRequestId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateDailyRequestResDTO)
  create(
    @Body() body: CreateDailyRequestBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.dailyRequestService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':dailyRequestId')
  @ZodSerializerDto(UpdateDailyRequestResDTO)
  update(
    @Body() body: UpdateDailyRequestBodyInputDTO,
    @Param() params: GetDailyRequestParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.dailyRequestService.update(
      {
        data: body,
        id: params.dailyRequestId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':dailyRequestId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetDailyRequestParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.dailyRequestService.delete(
      {
        id: params.dailyRequestId,
        deletedById: userId
      },
      lang
    )
  }
}
