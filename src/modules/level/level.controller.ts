import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreatedLevelBodyDTO,
  CreateLevelResDTO,
  GetLevelDetailResDTO,
  GetLevelParamsDTO,
  UpdateLevelBodyDTO,
  UpdateLevelResDTO
} from './dto/level.zod-dto'
import { LevelService } from './level.service'

@Controller('level')
export class LevelController {
  constructor(private readonly levelService: LevelService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO) {
    return this.levelService.list(query)
  }

  @Get(':levelId')
  @IsPublic()
  @ZodSerializerDto(GetLevelDetailResDTO)
  findById(@Param() params: GetLevelParamsDTO) {
    return this.levelService.findById(params.levelId)
  }

  @Post()
  @ZodSerializerDto(CreateLevelResDTO)
  create(@Body() body: CreatedLevelBodyDTO, @ActiveUser('userId') userId: number) {
    return this.levelService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':levelId')
  @ZodSerializerDto(UpdateLevelResDTO)
  update(
    @Body() body: UpdateLevelBodyDTO,
    @Param() params: GetLevelParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.levelService.update({
      data: body,
      id: params.levelId,
      updatedById: userId
    })
  }

  @Delete(':levelId')
  @ZodSerializerDto(MessageResDTO)
  delete(@Param() params: GetLevelParamsDTO, @ActiveUser('userId') userId: number) {
    return this.levelService.delete({
      id: params.levelId,
      deletedById: userId
    })
  }
}
