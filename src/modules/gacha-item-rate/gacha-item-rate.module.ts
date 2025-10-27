import { Module } from '@nestjs/common';
import { GachaItemRateService } from './gacha-item-rate.service';
import { GachaItemRateController } from './gacha-item-rate.controller';

@Module({
  controllers: [GachaItemRateController],
  providers: [GachaItemRateService],
})
export class GachaItemRateModule {}
