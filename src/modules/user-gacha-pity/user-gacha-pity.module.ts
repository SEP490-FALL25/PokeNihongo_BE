import { Module } from '@nestjs/common';
import { UserGachaPityService } from './user-gacha-pity.service';
import { UserGachaPityController } from './user-gacha-pity.controller';

@Module({
  controllers: [UserGachaPityController],
  providers: [UserGachaPityService],
})
export class UserGachaPityModule {}
