import { Module } from '@nestjs/common'
import { UserGachaPityController } from './user-gacha-pity.controller'
import { UserGachaPityRepo } from './user-gacha-pity.repo'
import { UserGachaPityService } from './user-gacha-pity.service'

@Module({
  controllers: [UserGachaPityController],
  providers: [UserGachaPityService, UserGachaPityRepo]
})
export class UserGachaPityModule {}
