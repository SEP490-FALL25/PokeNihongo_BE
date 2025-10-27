import { Module } from '@nestjs/common'
import { GachaItemRateController } from './gacha-item-rate.controller'
import { GachaItemRateRepo } from './gacha-item-rate.repo'
import { GachaItemRateService } from './gacha-item-rate.service'

@Module({
  controllers: [GachaItemRateController],
  providers: [GachaItemRateService, GachaItemRateRepo]
})
export class GachaItemRateModule {}
