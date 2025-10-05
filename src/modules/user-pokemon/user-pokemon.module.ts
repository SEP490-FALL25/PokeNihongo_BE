import { Module } from '@nestjs/common'
import { SharedModule } from 'src/shared/shared.module'
import { LevelModule } from '../level/level.module'
import { PokemonModule } from '../pokemon/pokemon.module'
import { UserPokemonController } from './user-pokemon.controller'
import { UserPokemonRepo } from './user-pokemon.repo'
import { UserPokemonService } from './user-pokemon.service'

@Module({
  imports: [SharedModule, LevelModule, PokemonModule],
  controllers: [UserPokemonController],
  providers: [UserPokemonService, UserPokemonRepo],
  exports: [UserPokemonService, UserPokemonRepo]
})
export class UserPokemonModule {}
