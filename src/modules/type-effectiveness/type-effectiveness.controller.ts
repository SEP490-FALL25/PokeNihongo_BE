import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateTypeEffectivenessBodyDTO,
  CreateTypeEffectivenessResDTO,
  GetTypeEffectivenessDetailResDTO,
  GetTypeEffectivenessParamsDTO,
  UpdateTypeEffectivenessBodyDTO,
  UpdateTypeEffectivenessResDTO
} from './dto/type-effectiveness.dto'
import { TypeEffectivenessService } from './type-effectiveness.service'

@Controller('type-effectiveness')
export class TypeEffectivenessController {
  constructor(private readonly typeEffectivenessService: TypeEffectivenessService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO) {
    return this.typeEffectivenessService.list(query)
  }

  @Get('matrix')
  @IsPublic()
  getMatrix() {
    return this.typeEffectivenessService.getEffectivenessMatrix()
  }

  @Get('weaknesses/:defenderId')
  @IsPublic()
  getWeaknesses(@Param('defenderId') defenderId: string) {
    return this.typeEffectivenessService.getWeaknessesForDefender(+defenderId)
  }

  @Get('resistances/:defenderId')
  @IsPublic()
  getResistances(@Param('defenderId') defenderId: string) {
    return this.typeEffectivenessService.getResistancesForDefender(+defenderId)
  }

  @Post('calculate-multi-type')
  @IsPublic()
  calculateMultiType(@Body() body: { defenderTypeIds: number[] }) {
    return this.typeEffectivenessService.calculateMultiTypeEffectiveness(
      body.defenderTypeIds
    )
  }

  @Get(':typeEffectivenessId')
  @IsPublic()
  @ZodSerializerDto(GetTypeEffectivenessDetailResDTO)
  findById(@Param() params: GetTypeEffectivenessParamsDTO) {
    return this.typeEffectivenessService.findById(params.typeEffectivenessId)
  }

  @Post()
  @ZodSerializerDto(CreateTypeEffectivenessResDTO)
  create(
    @Body() body: CreateTypeEffectivenessBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.typeEffectivenessService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':typeEffectivenessId')
  @ZodSerializerDto(UpdateTypeEffectivenessResDTO)
  update(
    @Body() body: UpdateTypeEffectivenessBodyDTO,
    @Param() params: GetTypeEffectivenessParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.typeEffectivenessService.update({
      data: body,
      id: params.typeEffectivenessId,
      updatedById: userId
    })
  }

  @Delete(':typeEffectivenessId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetTypeEffectivenessParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.typeEffectivenessService.delete({
      id: params.typeEffectivenessId,
      deletedById: userId
    })
  }
}
