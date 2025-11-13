import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateSubscriptionPlanBodyDTO,
  CreateSubscriptionPlanResDTO,
  GetSubscriptionPlanDetailResDTO,
  GetSubscriptionPlanParamsDTO,
  UpdateSubscriptionPlanBodyDTO,
  UpdateSubscriptionPlanResDTO
} from './dto/subscription-plan.dto'
import { SubscriptionPlanService } from './subscription-plan.service'

@Controller('subscription-plan')
export class SubscriptionPlanController {
  constructor(private readonly subscriptionPlanService: SubscriptionPlanService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.subscriptionPlanService.list(query, lang, roleName)
  }

  @Get(':subscriptionPlanId')
  @ZodSerializerDto(GetSubscriptionPlanDetailResDTO)
  findById(
    @Param() params: GetSubscriptionPlanParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.subscriptionPlanService.findById(
      params.subscriptionPlanId,
      lang,
      roleName
    )
  }

  @Post()
  @ZodSerializerDto(CreateSubscriptionPlanResDTO)
  create(
    @Body() body: CreateSubscriptionPlanBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.subscriptionPlanService.create({ userId, data: body }, lang)
  }

  @Put(':subscriptionPlanId')
  @ZodSerializerDto(UpdateSubscriptionPlanResDTO)
  update(
    @Param() params: GetSubscriptionPlanParamsDTO,
    @Body() body: UpdateSubscriptionPlanBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.subscriptionPlanService.update(
      { id: params.subscriptionPlanId, data: body, userId },
      lang
    )
  }

  @Delete(':subscriptionPlanId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetSubscriptionPlanParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.subscriptionPlanService.delete(
      {
        id: params.subscriptionPlanId,
        userId
      },
      lang
    )
  }
}
