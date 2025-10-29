import { Module } from '@nestjs/common';
import { GachaPurchaseService } from './gacha-purchase.service';
import { GachaPurchaseController } from './gacha-purchase.controller';

@Module({
  controllers: [GachaPurchaseController],
  providers: [GachaPurchaseService],
})
export class GachaPurchaseModule {}
