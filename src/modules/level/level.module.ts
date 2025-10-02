import { Module } from '@nestjs/common'
import { LevelController } from './level.controller'
import { LevelRepo } from './level.repo'
import { LevelService } from './level.service'

@Module({
  controllers: [LevelController],
  providers: [LevelService, LevelRepo],
  exports: [LevelService, LevelRepo]
})
export class LevelModule {}
