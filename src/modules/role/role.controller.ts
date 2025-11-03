import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateRoleBodyDTO,
  CreateRoleResDTO,
  GetRoleDetailResDTO,
  GetRoleParamsDTO,
  UpdateRoleBodyDTO,
  UpdateRoleResDTO
} from 'src/modules/role/role.dto'
import { RoleService } from 'src/modules/role/role.service'
import { MessageResDTO } from 'src/shared/dtos/response.dto'

@Controller('roles')
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.roleService.list(query, lang)
  }

  @Get(':roleId')
  @ZodSerializerDto(GetRoleDetailResDTO)
  findById(
    @Param() params: GetRoleParamsDTO,
    @Query() query: PaginationQueryDTO,
    @I18nLang() lang: string
  ) {
    return this.roleService.findById(params.roleId, query, lang)
  }

  @Post()
  @ZodSerializerDto(CreateRoleResDTO)
  create(
    @Body() body: CreateRoleBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roleService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':roleId')
  @ZodSerializerDto(UpdateRoleResDTO)
  update(
    @Body() body: UpdateRoleBodyDTO,
    @Param() params: GetRoleParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roleService.update(
      {
        data: body,
        id: params.roleId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':roleId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetRoleParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.roleService.delete(
      {
        id: params.roleId,
        deletedById: userId
      },
      lang
    )
  }
}
