import { MailModule } from '@/3rdService/mail/mail.module'
import { LevelRepo } from '@/modules/level/level.repo'
import { UserPokemonRepo } from '@/modules/user-pokemon/user-pokemon.repo'
import { SharedModule } from '@/shared/shared.module'
import { Module } from '@nestjs/common'
import { UserController } from './user.controller'
import { UserRepo } from './user.repo'
import { UserService } from './user.service'

@Module({
  imports: [SharedModule, MailModule],
  controllers: [UserController],
  providers: [UserService, UserRepo, UserPokemonRepo, LevelRepo],
  exports: [UserService, UserRepo]
})
export class UserModule {}
