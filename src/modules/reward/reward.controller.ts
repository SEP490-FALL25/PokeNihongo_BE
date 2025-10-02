import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreatedRewardBodyDTO,
  CreateRewardResDTO,
  GetRewardDetailResDTO,
  GetRewardParamsDTO,
  UpdateRewardBodyDTO,
  UpdateRewardResDTO
} from './dto/reward.zod-dto'
import { RewardService } from './reward.service'

@Controller('reward')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO) {
    return this.rewardService.list(query)
  }

  @Get(':rewardId')
  @IsPublic()
  @ZodSerializerDto(GetRewardDetailResDTO)
  findById(@Param() params: GetRewardParamsDTO) {
    return this.rewardService.findById(params.rewardId)
  }

  @Post()
  @ZodSerializerDto(CreateRewardResDTO)
  create(@Body() body: CreatedRewardBodyDTO, @ActiveUser('userId') userId: number) {
    return this.rewardService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':rewardId')
  @ZodSerializerDto(UpdateRewardResDTO)
  update(
    @Body() body: UpdateRewardBodyDTO,
    @Param() params: GetRewardParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.rewardService.update({
      data: body,
      id: params.rewardId,
      updatedById: userId
    })
  }

  @Delete(':rewardId')
  @ZodSerializerDto(MessageResDTO)
  delete(@Param() params: GetRewardParamsDTO, @ActiveUser('userId') userId: number) {
    return this.rewardService.delete({
      id: params.rewardId,
      deletedById: userId
    })
  }
}
