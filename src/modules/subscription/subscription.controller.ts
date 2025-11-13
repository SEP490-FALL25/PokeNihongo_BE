import { ActiveUser } from '@/common/decorators/active-user.decorator'
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
  CreatedSubscriptionBodyInputDTO,
  CreateSubscriptionResDTO,
  GetSubscriptionDetailResDTO,
  GetSubscriptionParamsDTO,
  UpdateSubscriptionBodyInputDTO,
  UpdateSubscriptionResDTO
} from './dto/subscription.zod-dto'
import { SubscriptionService } from './subscription.service'

@Controller('subscription')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.subscriptionService.list(query, lang, roleName)
  }

  @Post()
  @ZodSerializerDto(CreateSubscriptionResDTO)
  create(
    @Body() body: CreatedSubscriptionBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.subscriptionService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Get(':subscriptionId')
  @ZodSerializerDto(GetSubscriptionDetailResDTO)
  findById(
    @Param() params: GetSubscriptionParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.subscriptionService.findById(params.subscriptionId, roleName, lang)
  }

  @Put(':subscriptionId')
  @ZodSerializerDto(UpdateSubscriptionResDTO)
  update(
    @Body() body: UpdateSubscriptionBodyInputDTO,
    @Param() params: GetSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.subscriptionService.update(
      {
        data: body,
        id: params.subscriptionId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':subscriptionId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetSubscriptionParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.subscriptionService.delete(
      {
        id: params.subscriptionId,
        deletedById: userId
      },
      lang
    )
  }
}
