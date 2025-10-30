import { Module } from '@nestjs/common'
import { GachaRollHistoryController } from './gacha-roll-history.controller'
import { GachaRollHistoryRepo } from './gacha-roll-history.repo'
import { GachaRollHistoryService } from './gacha-roll-history.service'

@Module({
  controllers: [GachaRollHistoryController],
  providers: [GachaRollHistoryService, GachaRollHistoryRepo],
  exports: [GachaRollHistoryService, GachaRollHistoryRepo]
})
export class GachaRollHistoryModule {}
