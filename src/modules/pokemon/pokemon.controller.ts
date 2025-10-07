import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreatePokemonBodyDTO,
  CreatePokemonResDTO,
  GetEvolutionOptionsResDTO,
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
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.pokemonService.list(query, lang)
  }

  // @Get('starters')
  // @IsPublic()
  // getStarters() {
  //   return this.pokemonService.getStarterPokemons()
  // }

  // @Get('rarity/:rarity')
  // @IsPublic()
  // getByRarity(@Param('rarity') rarity: string) {
  //   return this.pokemonService.getPokemonsByRarity(rarity)
  // }

  // @Get('type/:typeName')
  // @IsPublic()
  // getByType(@Param('typeName') typeName: string) {
  //   return this.pokemonService.getPokemonsByType(typeName)
  // }

  @Get(':pokemonId/weaknesses')
  @IsPublic()
  @ZodSerializerDto(GetPokemonWeaknessResDTO)
  getWeaknesses(@Param() params: GetPokemonParamsDTO, @I18nLang() lang: string) {
    return this.pokemonService.calculatePokemonWeaknesses(params.pokemonId, lang)
  }

  @Get(':pokemonId/evolution-options')
  @IsPublic()
  @ZodSerializerDto(GetEvolutionOptionsResDTO)
  getEvolutionOptions(@Param() params: GetPokemonParamsDTO, @I18nLang() lang: string) {
    return this.pokemonService.getEvolutionOptions(params.pokemonId, lang)
  }

  @Get(':pokemonId')
  @IsPublic()
  @ZodSerializerDto(GetPokemonDetailResDTO)
  findById(@Param() params: GetPokemonParamsDTO, @I18nLang() lang: string) {
    return this.pokemonService.findById(params.pokemonId, lang)
  }

  @Post()
  @IsPublic()
  @ZodSerializerDto(CreatePokemonResDTO)
  create(
    @Body() body: CreatePokemonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.pokemonService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':pokemonId')
  @IsPublic()
  @ZodSerializerDto(UpdatePokemonResDTO)
  update(
    @Body() body: UpdatePokemonBodyDTO,
    @Param() params: GetPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.pokemonService.update(
      {
        data: body,
        id: params.pokemonId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':pokemonId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.pokemonService.delete(
      {
        id: params.pokemonId,
        deletedById: userId
      },
      lang
    )
  }

  // @Post(':pokemonId/assign-types')
  // @ZodSerializerDto(MessageResDTO)
  // assignTypes(
  //   @Param() params: GetPokemonParamsDTO,
  //   @Body() body: AssignPokemonTypesBodyDTO
  // ) {
  //   return this.pokemonService.assignTypes(params.pokemonId, body)
  // }
}
