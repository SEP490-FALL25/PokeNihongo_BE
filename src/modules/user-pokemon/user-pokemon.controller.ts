import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  AddExpBodyDTO,
  CreateUserPokemonBodyDTO,
  CreateUserPokemonResDTO,
  EvolvePokemonBodyDTO,
  EvolvePokemonResDTO,
  GetUserPokemonDetailResDTO,
  GetUserPokemonParamsDTO,
  UpdateUserPokemonBodyDTO,
  UpdateUserPokemonResDTO
} from './dto/user-pokemon.dto'
import { UserPokemonService } from './user-pokemon.service'

@Controller('user-pokemon')
export class UserPokemonController {
  constructor(private readonly userPokemonService: UserPokemonService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO, @ActiveUser('userId') userId: number) {
    return this.userPokemonService.list(query, userId)
  }

  @Get('my-pokemons')
  getMyPokemons(@ActiveUser('userId') userId: number) {
    return this.userPokemonService.getUserPokemons(userId)
  }

  @Post(':userPokemonId/evolve')
  @ZodSerializerDto(EvolvePokemonResDTO)
  evolvePokemon(
    @Param() params: GetUserPokemonParamsDTO,
    @Body() body: EvolvePokemonBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userPokemonService.evolvePokemon(params.userPokemonId, body, userId)
  }

  @Get(':userPokemonId')
  @ZodSerializerDto(GetUserPokemonDetailResDTO)
  findById(
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userPokemonService.findById(params.userPokemonId)
  }

  @Post()
  @ZodSerializerDto(CreateUserPokemonResDTO)
  create(@Body() body: CreateUserPokemonBodyDTO, @ActiveUser('userId') userId: number) {
    return this.userPokemonService.create({
      userId,
      data: body
    })
  }

  @Put(':userPokemonId')
  @ZodSerializerDto(UpdateUserPokemonResDTO)
  update(
    @Body() body: UpdateUserPokemonBodyDTO,
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userPokemonService.update({
      data: body,
      id: params.userPokemonId,
      userId
    })
  }

  @Delete(':userPokemonId')
  @ZodSerializerDto(MessageResDTO)
  delete(@Param() params: GetUserPokemonParamsDTO, @ActiveUser('userId') userId: number) {
    return this.userPokemonService.delete({
      id: params.userPokemonId,
      userId
    })
  }

  @Post(':userPokemonId/add-exp')
  @ZodSerializerDto(GetUserPokemonDetailResDTO)
  addExp(
    @Param() params: GetUserPokemonParamsDTO,
    @Body() body: AddExpBodyDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.userPokemonService.addExp(params.userPokemonId, body, userId)
  }

  // Admin endpoints
  @Get('admin/all')
  @IsPublic() // Remove this in production, add admin guard
  @ZodSerializerDto(PaginationResponseDTO)
  adminList(@Query() query: PaginationQueryDTO) {
    return this.userPokemonService.list(query)
  }
}
