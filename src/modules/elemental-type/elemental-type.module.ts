import { SharedModule } from '@/shared/shared.module'
import { Module } from '@nestjs/common'
import { ElementalTypeController } from './elemental-type.controller'
import { ElementalTypeRepo } from './elemental-type.repo'
import { ElementalTypeService } from './elemental-type.service'

@Module({
  imports: [SharedModule],
  controllers: [ElementalTypeController],
  providers: [ElementalTypeService, ElementalTypeRepo],
  exports: [ElementalTypeService, ElementalTypeRepo]
})
export class ElementalTypeModule {}
