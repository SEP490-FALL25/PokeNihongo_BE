import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
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
  list(
    @Query() query: PaginationQueryDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.list(query, userId, lang)
  }

  @Post(':userPokemonId/evolve')
  @ZodSerializerDto(EvolvePokemonResDTO)
  evolvePokemon(
    @Param() params: GetUserPokemonParamsDTO,
    @Body() body: EvolvePokemonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.evolvePokemon(params.userPokemonId, body, userId, lang)
  }

  @Get(':userPokemonId')
  @ZodSerializerDto(GetUserPokemonDetailResDTO)
  findById(
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.findById(params.userPokemonId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateUserPokemonResDTO)
  create(
    @Body() body: CreateUserPokemonBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.create(
      {
        userId,
        data: body
      },
      lang
    )
  }

  @Put(':userPokemonId')
  @ZodSerializerDto(UpdateUserPokemonResDTO)
  update(
    @Body() body: UpdateUserPokemonBodyDTO,
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.update(
      {
        data: body,
        id: params.userPokemonId,
        userId
      },
      lang
    )
  }

  @Delete(':userPokemonId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetUserPokemonParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.delete(
      {
        id: params.userPokemonId,
        userId
      },
      lang
    )
  }

  @Post(':userPokemonId/add-exp')
  @ZodSerializerDto(GetUserPokemonDetailResDTO)
  addExp(
    @Param() params: GetUserPokemonParamsDTO,
    @Body() body: AddExpBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.userPokemonService.addExp(params.userPokemonId, body, userId, lang)
  }

  // Admin endpoints
  // @Get('admin/all')
  // @IsPublic() // Remove this in production, add admin guard
  // @ZodSerializerDto(PaginationResponseDTO)
  // adminList(@Query() query: PaginationQueryDTO) {
  //   return this.userPokemonService.list(query)
  // }
}
