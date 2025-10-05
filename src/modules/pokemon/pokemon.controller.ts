import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  AssignPokemonTypesBodyDTO,
  CreatePokemonBodyDTO,
  CreatePokemonResDTO,
  GetPokemonDetailResDTO,
  GetPokemonParamsDTO,
  GetPokemonWeaknessResDTO,
  UpdatePokemonBodyDTO,
  UpdatePokemonResDTO
} from './dto/pokemon.dto'
import { PokemonService } from './pokemon.service'

@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseDTO)
  list(@Query() query: PaginationQueryDTO) {
    return this.pokemonService.list(query)
  }

  @Get('starters')
  @IsPublic()
  getStarters() {
    return this.pokemonService.getStarterPokemons()
  }

  @Get('rarity/:rarity')
  @IsPublic()
  getByRarity(@Param('rarity') rarity: string) {
    return this.pokemonService.getPokemonsByRarity(rarity)
  }

  @Get('type/:typeName')
  @IsPublic()
  getByType(@Param('typeName') typeName: string) {
    return this.pokemonService.getPokemonsByType(typeName)
  }

  @Get(':pokemonId/weaknesses')
  @IsPublic()
  @ZodSerializerDto(GetPokemonWeaknessResDTO)
  getWeaknesses(@Param() params: GetPokemonParamsDTO) {
    return this.pokemonService.calculatePokemonWeaknesses(params.pokemonId)
  }

  @Get(':pokemonId')
  @IsPublic()
  @ZodSerializerDto(GetPokemonDetailResDTO)
  findById(@Param() params: GetPokemonParamsDTO) {
    return this.pokemonService.findById(params.pokemonId)
  }

  @Post()
  @ZodSerializerDto(CreatePokemonResDTO)
  create(@Body() body: CreatePokemonBodyDTO, @ActiveUser('userId') userId: number) {
    return this.pokemonService.create({
      data: body,
      createdById: userId
    })
  }

  @Put(':pokemonId')
  @ZodSerializerDto(UpdatePokemonResDTO)
  update(
    @Body() body: UpdatePokemonBodyDTO,
    @Param() params: GetPokemonParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.pokemonService.update({
      data: body,
      id: params.pokemonId,
      updatedById: userId
    })
  }

  @Delete(':pokemonId')
  @ZodSerializerDto(MessageResDTO)
  delete(@Param() params: GetPokemonParamsDTO, @ActiveUser('userId') userId: number) {
    return this.pokemonService.delete({
      id: params.pokemonId,
      deletedById: userId
    })
  }

  @Post(':pokemonId/assign-types')
  @ZodSerializerDto(MessageResDTO)
  assignTypes(
    @Param() params: GetPokemonParamsDTO,
    @Body() body: AssignPokemonTypesBodyDTO
  ) {
    return this.pokemonService.assignTypes(params.pokemonId, body)
  }
}
