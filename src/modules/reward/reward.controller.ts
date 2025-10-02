import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreatedRewardBodyDTO,
  GetRewardDetailResDTO,
  GetRewardParamsDTO,
  UpdateRewardBodyDTO
} from './dto/reward.zod-dto'
import { RewardService } from './reward.service'

@Controller('reward')
export class RewardController {
  constructor(private readonly categoryService: RewardService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO) {
    return this.categoryService.list(query)
  }

  @Get(':rewardId')
  @IsPublic()
  @ZodSerializerDto(GetRewardDetailResDTO)
  findById(@Param() params: GetRewardParamsDTO) {
    return this.categoryService.findById(params.rewardId)
  }

  @Post()
  @ZodSerializerDto(GetRewardDetailResDTO)
  create(@Body() body: CreatedRewardBodyDTO, @ActiveUser('userId') userId: number) {
    return this.categoryService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':rewardId')
  @ZodSerializerDto(GetRewardDetailResDTO)
  update(
    @Body() body: UpdateRewardBodyDTO,
    @Param() params: GetRewardParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.categoryService.update({
      data: body,
      id: params.rewardId,
      updatedById: userId
    })
  }

  @Delete(':rewardId')
  @ZodSerializerDto(MessageResDTO)
  delete(@Param() params: GetRewardParamsDTO, @ActiveUser('userId') userId: number) {
    return this.categoryService.delete({
      id: params.rewardId,
      deletedById: userId
    })
  }
}
