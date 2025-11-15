import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateUserSubscriptionBodyDTO,
  CreateUserSubscriptionResDTO,
  GetUserSubscriptionDetailResDTO,
  GetUserSubscriptionParamsDTO,
  UpdateUserSubscriptionBodyDTO,
  UpdateUserSubscriptionResDTO
} from './dto/user-subscription.dto'
import { UserSubscriptionService } from './user-subscription.service'

@Controller('user-subscription')
export class UserSubscriptionController {
  constructor(private readonly userSubscriptionService: UserSubscriptionService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.userSubscriptionService.list(query, lang)
  }

  @Get('user')
  @ZodSerializerDto(PaginationResponseDTO)
  getUserSubWithSubPlan(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userSubscriptionService.getUserSubWithSubPlan(query, userId, lang)
  }

  @Get(':userSubscriptionId')
  @ZodSerializerDto(GetUserSubscriptionDetailResDTO)
  findById(
    @Param() params: GetUserSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userSubscriptionService.findById(params.userSubscriptionId, lang)
  }
  @Post()
  @ZodSerializerDto(CreateUserSubscriptionResDTO)
  create(
    @Body() body: CreateUserSubscriptionBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userSubscriptionService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':userSubscriptionId')
  @ZodSerializerDto(UpdateUserSubscriptionResDTO)
  update(
    @Body() body: UpdateUserSubscriptionBodyDTO,
    @Param() params: GetUserSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userSubscriptionService.update(
      {
        data: body,
        id: params.userSubscriptionId,
        userId
      },
      lang
    )
  }

  @Delete(':userSubscriptionId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetUserSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userSubscriptionService.delete(
      {
        id: params.userSubscriptionId,
        userId
      },
      lang
    )
  }
}
