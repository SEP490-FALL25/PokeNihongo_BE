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
  CreatedFeatureBodyInputDTO,
  CreateFeatureResDTO,
  GetFeatureDetailResDTO,
  GetFeatureParamsDTO,
  UpdateFeatureBodyInputDTO,
  UpdateFeatureResDTO
} from './dto/feature.zod-dto'
import { FeatureService } from './feature.service'

@Controller('Feature')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class FeatureController {
  constructor(private readonly FeatureService: FeatureService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.FeatureService.list(query, lang, roleName)
  }

  @Post()
  @ZodSerializerDto(CreateFeatureResDTO)
  create(
    @Body() body: CreatedFeatureBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.FeatureService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Get(':FeatureId')
  @ZodSerializerDto(GetFeatureDetailResDTO)
  findById(
    @Param() params: GetFeatureParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.FeatureService.findById(params.featureId, roleName, lang)
  }

  @Put(':FeatureId')
  @ZodSerializerDto(UpdateFeatureResDTO)
  update(
    @Body() body: UpdateFeatureBodyInputDTO,
    @Param() params: GetFeatureParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.FeatureService.update(
      {
        data: body,
        id: params.featureId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':FeatureId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetFeatureParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.FeatureService.delete(
      {
        id: params.featureId,
        deletedById: userId
      },
      lang
    )
  }
}
