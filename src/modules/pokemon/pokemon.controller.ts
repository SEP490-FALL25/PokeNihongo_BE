import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO, PaginationResponseDTO } from '@/shared/dtos/response.dto'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  AssignPokemonTypesBodyDTO,
  CreatePokemonFormDataDTO,
  CreatePokemonResDTO,
  GetPokemonDetailResDTO,
  GetPokemonParamsDTO,
  GetPokemonWeaknessResDTO,
  UpdatePokemonFormDataDTO,
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
  @UseInterceptors(FileInterceptor('image'))
  @ZodSerializerDto(CreatePokemonResDTO)
  create(
    @Body() body: CreatePokemonFormDataDTO,
    @UploadedFile() image: Express.Multer.File,
    @ActiveUser('userId') userId: number
  ) {
    return this.pokemonService.create({
      data: body,
      createdById: userId,
      imageFile: image
    })
  }

  @Put(':pokemonId')
  @UseInterceptors(FileInterceptor('image'))
  @ZodSerializerDto(UpdatePokemonResDTO)
  update(
    @Body() body: UpdatePokemonFormDataDTO,
    @UploadedFile() image: Express.Multer.File,
    @Param() params: GetPokemonParamsDTO,
    @ActiveUser('userId') userId: number
  ) {
    return this.pokemonService.update({
      data: body,
      id: params.pokemonId,
      updatedById: userId,
      imageFile: image
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
