import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import { GetSubscriptionParamsDTO } from '../subscription/dto/subscription.zod-dto'
import {
  GetSubscriptionFeatureDetailResDTO,
  GetSubscriptionFeatureParamsDTO,
  UpdateWithListItemBodyDTO,
  UpdateWithListItemResDTO
} from './dto/subscription-feature.dto'
import { SubscriptionFeatureService } from './subscription-feature.service'

@Controller('subscription-feature')
export class SubscriptionFeatureController {
  constructor(private readonly subscriptionFeatureService: SubscriptionFeatureService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.subscriptionFeatureService.list(query, lang)
  }

  @Get(':subscriptionFeatureId')
  @ZodSerializerDto(GetSubscriptionFeatureDetailResDTO)
  findById(
    @Param() params: GetSubscriptionFeatureParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.subscriptionFeatureService.findById(params.subscriptionFeatureId, lang)
  }

  @Put('subscription/:subscriptionId')
  @ZodSerializerDto(UpdateWithListItemResDTO)
  updateWithListFeature(
    @Body() body: UpdateWithListItemBodyDTO,
    @Param() params: GetSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.subscriptionFeatureService.updateWithListFeature(
      {
        subscriptionId: params.subscriptionId,
        updatedById: userId,
        data: body
      },
      lang
    )
  }

  @Delete(':subscriptionFeatureId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetSubscriptionFeatureParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.subscriptionFeatureService.delete(
      {
        id: params.subscriptionFeatureId,
        userId
      },
      lang
    )
  }
}
