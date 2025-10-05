import { Module } from '@nestjs/common'
import { TypeEffectivenessController } from './type-effectiveness.controller'
import { TypeEffectivenessRepo } from './type-effectiveness.repo'
import { TypeEffectivenessService } from './type-effectiveness.service'

@Module({
  controllers: [TypeEffectivenessController],
  providers: [TypeEffectivenessService, TypeEffectivenessRepo],
  exports: [TypeEffectivenessService, TypeEffectivenessRepo]
})
export class TypeEffectivenessModule {}
