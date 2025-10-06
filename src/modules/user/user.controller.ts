import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateUserBodyDTO,
  CreateUserResDTO,
  GetUserDetailResDTO,
  GetUserParamsDTO,
  SetMainPokemonBodyDTO,
  UpdateUserBodyDTO,
  UpdateUserResDTO
} from './dto/user.zod-dto'
import { UserService } from './user.service'

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO) {
    return this.userService.list(query)
  }

  @Get(':userId')
  @ZodSerializerDto(GetUserDetailResDTO)
  findById(@Param() params: GetUserParamsDTO) {
    return this.userService.findById(params.userId)
  }

  @Post()
  @ZodSerializerDto(CreateUserResDTO)
  create(@Body() body: CreateUserBodyDTO, @ActiveUser('userId') userId: number) {
    return this.userService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':userId')
  @ZodSerializerDto(UpdateUserResDTO)
  update(
    @Body() body: UpdateUserBodyDTO,
    @Param() params: GetUserParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userService.update({
      data: body,
      id: params.userId,
      updatedById: userId
    })
  }

  @Delete(':userId')
  @ZodSerializerDto(MessageResDTO)
  delete(@Param() params: GetUserParamsDTO, @ActiveUser('userId') userId: number) {
    return this.userService.delete({
      id: params.userId,
      deletedById: userId
    })
  }

  @Post('me/set-main-pokemon')
  @ZodSerializerDto(MessageResDTO)
  setMainPokemon(
    @Body() body: SetMainPokemonBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userService.setMainPokemon(userId, body)
  }
}
