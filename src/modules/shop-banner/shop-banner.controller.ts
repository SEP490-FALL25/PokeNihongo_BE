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
  CreatedShopBannerBodyInputDTO,
  CreateShopBannerResDTO,
  GetShopBannerByTodayResDTO,
  GetShopBannerDetailResDTO,
  GetShopBannerParamsDTO,
  UpdateShopBannerBodyInputDTO,
  UpdateShopBannerResDTO
} from './dto/shop-banner.zod-dto'
import { ShopBannerService } from './shop-banner.service'

@Controller('shop-banner')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class ShopBannerController {
  constructor(private readonly shopBannerService: ShopBannerService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.shopBannerService.list(query, lang)
  }

  @Get('all/details')
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  listwithDetail(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.shopBannerService.listwithDetail(query, lang)
  }

  @Get('today/user')
  @ZodSerializerDto(GetShopBannerByTodayResDTO)
  getByToday(@I18nLang() lang: string, @ActiveUser('userId') userId?: number) {
    return this.shopBannerService.getByToday(lang, userId)
  }

  @Get(':shopBannerId')
  @IsPublic()
  @ZodSerializerDto(GetShopBannerDetailResDTO)
  findById(@Param() params: GetShopBannerParamsDTO, @I18nLang() lang: string) {
    return this.shopBannerService.findById(params.shopBannerId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateShopBannerResDTO)
  create(
    @Body() body: CreatedShopBannerBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopBannerService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':shopBannerId')
  @ZodSerializerDto(UpdateShopBannerResDTO)
  update(
    @Body() body: UpdateShopBannerBodyInputDTO,
    @Param() params: GetShopBannerParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopBannerService.update(
      {
        data: body,
        id: params.shopBannerId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':shopBannerId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetShopBannerParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.shopBannerService.delete(
      {
        id: params.shopBannerId,
        deletedById: userId
      },
      lang
    )
  }
}
