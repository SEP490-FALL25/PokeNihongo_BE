import { Module } from '@nestjs/common';
import { DebuffRoundService } from './debuff-round.service';
import { DebuffRoundController } from './debuff-round.controller';

@Module({
  controllers: [DebuffRoundController],
  providers: [DebuffRoundService],
})
export class DebuffRoundModule {}
