import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateElementalTypeBodyDTO,
  CreateElementalTypeResDTO,
  GetElementalTypeDetailResDTO,
  GetElementalTypeParamsDTO,
  UpdateElementalTypeBodyDTO,
  UpdateElementalTypeResDTO
} from './dto/elemental-type.zod-dto'
import { ElementalTypeService } from './elemental-type.service'

@Controller('elemental-type')
export class ElementalTypeController {
  constructor(private readonly elementalTypeService: ElementalTypeService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO) {
    return this.elementalTypeService.list(query)
  }

  @Get('active')
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  getAllActiveTypes() {
    return this.elementalTypeService.getAllActiveTypes()
  }

  @Get(':elementId')
  @IsPublic()
  @ZodSerializerDto(GetElementalTypeDetailResDTO)
  findById(@Param() params: GetElementalTypeParamsDTO) {
    return this.elementalTypeService.findById(params.elementId)
  }

  @Post()
  @ZodSerializerDto(CreateElementalTypeResDTO)
  create(@Body() body: CreateElementalTypeBodyDTO, @ActiveUser('userId') userId: number) {
    return this.elementalTypeService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':elementId')
  @ZodSerializerDto(UpdateElementalTypeResDTO)
  update(
    @Body() body: UpdateElementalTypeBodyDTO,
    @Param() params: GetElementalTypeParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.elementalTypeService.update({
      data: body,
      id: params.elementId,
      updatedById: userId
    })
  }

  @Delete(':elementId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetElementalTypeParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.elementalTypeService.delete({
      id: params.elementId,
      deletedById: userId
    })
  }
}
