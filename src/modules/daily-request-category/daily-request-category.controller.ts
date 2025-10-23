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
import { DailyRequestCategoryService } from './daily-request-category.service'
import {
  CreateDailyRequestCategoryBodyInputDTO,
  CreateDailyRequestCategoryResDTO,
  GetDailyRequestCategoryDetailResDTO,
  GetDailyRequestCategoryParamsDTO,
  UpdateDailyRequestCategoryBodyInputDTO,
  UpdateDailyRequestCategoryResDTO
} from './dto/daily-request-category.zod-dto'

@Controller('daily-request-category')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class DailyRequestCategoryController {
  constructor(
    private readonly DailyRequestCategoryService: DailyRequestCategoryService
  ) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.DailyRequestCategoryService.list(query, lang)
  }
  @Get('daily-requests')
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  listWithDaylyRequest(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.DailyRequestCategoryService.listWithDailyRequest(query, lang)
  }

  @Get(':dailyRequestCategoryId')
  @IsPublic()
  @ZodSerializerDto(GetDailyRequestCategoryDetailResDTO)
  findById(@Param() params: GetDailyRequestCategoryParamsDTO, @I18nLang() lang: string) {
    return this.DailyRequestCategoryService.findById(params.dailyRequestCategoryId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateDailyRequestCategoryResDTO)
  create(
    @Body() body: CreateDailyRequestCategoryBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.DailyRequestCategoryService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':dailyRequestCategoryId')
  @ZodSerializerDto(UpdateDailyRequestCategoryResDTO)
  update(
    @Body() body: UpdateDailyRequestCategoryBodyInputDTO,
    @Param() params: GetDailyRequestCategoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.DailyRequestCategoryService.update(
      {
        data: body,
        id: params.dailyRequestCategoryId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':dailyRequestCategoryId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetDailyRequestCategoryParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.DailyRequestCategoryService.delete(
      {
        id: params.dailyRequestCategoryId,
        deletedById: userId
      },
      lang
    )
  }
}
