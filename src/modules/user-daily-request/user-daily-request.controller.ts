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
import {
  CreatedUserDailyRequestBodyDTO,
  CreateUserDailyRequestResDTO,
  GetListUserDailyRequestTodayDetailResDTO,
  GetRewardListUserDailyRequestTodayDetailResDTO,
  GetUserDailyRequestDetailResDTO,
  GetUserDailyRequestParamsDTO,
  UpdateUserDailyRequestBodyDTO,
  UpdateUserDailyRequestResDTO
} from './dto/user-daily-request.zod-dto'
import { UserDailyRequestService } from './user-daily-request.service'

@Controller('user-daily-request')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class UserDailyRequestController {
  constructor(private readonly userDailyReqService: UserDailyRequestService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.userDailyReqService.list(query, lang)
  }

  @Post('attendence')
  @ZodSerializerDto(GetRewardListUserDailyRequestTodayDetailResDTO)
  presentUserToday(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.userDailyReqService.presentUserToday(userId, lang)
  }

  @Get('user-today')
  @ZodSerializerDto(GetListUserDailyRequestTodayDetailResDTO)
  getUserDailyRequestsToday(
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userDailyReqService.getUserDailyRequestsToday(userId, lang)
  }

  @Get(':userDailyRequestId')
  @IsPublic()
  @ZodSerializerDto(GetUserDailyRequestDetailResDTO)
  findById(@Param() params: GetUserDailyRequestParamsDTO, @I18nLang() lang: string) {
    return this.userDailyReqService.findById(params.userDailyRequestId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateUserDailyRequestResDTO)
  create(
    @Body() body: CreatedUserDailyRequestBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userDailyReqService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':userDailyRequestId')
  @ZodSerializerDto(UpdateUserDailyRequestResDTO)
  update(
    @Body() body: UpdateUserDailyRequestBodyDTO,
    @Param() params: GetUserDailyRequestParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userDailyReqService.update(
      {
        data: body,
        id: params.userDailyRequestId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':userDailyRequestId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetUserDailyRequestParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userDailyReqService.delete(
      {
        id: params.userDailyRequestId,
        deletedById: userId
      },
      lang
    )
  }
}
