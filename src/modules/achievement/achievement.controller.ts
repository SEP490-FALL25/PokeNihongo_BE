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
import { AchievementService } from './achievement.service'
import {
  CreateAchievementBodyInputDTO,
  CreateAchievementResDTO,
  GetAchievementDetailResDTO,
  GetAchievementParamsDTO,
  UpdateAchievementBodyInputDTO,
  UpdateAchievementResDTO
} from './dto/achievement.zod-dto'

@Controller('achievement')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class AchievementController {
  constructor(private readonly achievementService: AchievementService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  list(
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.achievementService.list(query, lang, roleName)
  }

  @Post()
  @ZodSerializerDto(CreateAchievementResDTO)
  create(
    @Body() body: CreateAchievementBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.achievementService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Get(':achievementId')
  @ZodSerializerDto(GetAchievementDetailResDTO)
  findById(
    @Param() params: GetAchievementParamsDTO,
    @I18nLang() lang: string,
    @ActiveUser('roleName') roleName: string
  ) {
    return this.achievementService.findById(params.achievementId, roleName, lang)
  }

  @Put(':achievementId')
  @ZodSerializerDto(UpdateAchievementResDTO)
  update(
    @Body() body: UpdateAchievementBodyInputDTO,
    @Param() params: GetAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.achievementService.update(
      {
        data: body,
        id: params.achievementId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':achievementId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetAchievementParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.achievementService.delete(
      {
        id: params.achievementId,
        deletedById: userId
      },
      lang
    )
  }
}
