import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import { AchievementGroupService } from './achievement-group.service'
import {
  CreateAchievementGroupBodyInputDTO,
  CreateAchievementGroupResDTO,
  GetAchievementGroupDetailResDTO,
  GetAchievementGroupParamsDTO,
  UpdateAchievementGroupBodyInputDTO,
  UpdateAchievementGroupResDTO
} from './dto/achievement-group.zod-dto'

@Controller('achievement-group')
@ApiBearerAuth()
export class AchievementGroupController {
  constructor(private readonly achievementGroupService: AchievementGroupService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.achievementGroupService.list(query, lang)
  }

  @Get(':achievementGroupId')
  @IsPublic()
  @ZodSerializerDto(GetAchievementGroupDetailResDTO)
  findById(@Param() params: GetAchievementGroupParamsDTO, @I18nLang() lang: string) {
    return this.achievementGroupService.findById(params.achievementGroupId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateAchievementGroupResDTO)
  create(
    @Body() body: CreateAchievementGroupBodyInputDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.achievementGroupService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':achievementGroupId')
  @ZodSerializerDto(UpdateAchievementGroupResDTO)
  update(
    @Body() body: UpdateAchievementGroupBodyInputDTO,
    @Param() params: GetAchievementGroupParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.achievementGroupService.update(
      {
        data: body,
        id: params.achievementGroupId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':achievementGroupId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetAchievementGroupParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.achievementGroupService.delete(
      {
        id: params.achievementGroupId,
        deletedById: userId
      },
      lang
    )
  }
}
