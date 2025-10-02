import { MailModule } from '@/3rdService/mail/mail.module'
import { AuthRepository } from '@/modules/auth/auth.repo'
import { Module } from '@nestjs/common'
import { LevelModule } from '../level/level.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { GoogleService } from './google.service'

@Module({
  imports: [MailModule, LevelModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, GoogleService]
})
export class AuthModule {}
