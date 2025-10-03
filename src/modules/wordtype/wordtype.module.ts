import { Module } from '@nestjs/common'
import { WordTypeController } from './wordtype.controller'
import { WordTypeService } from './wordtype.service'
import { WordTypeRepository } from './wordtype.repo'
import { SharedModule } from '@/shared/shared.module'

@Module({
    imports: [SharedModule],
    controllers: [WordTypeController],
    providers: [WordTypeService, WordTypeRepository],
    exports: [WordTypeService, WordTypeRepository]
})
export class WordTypeModule { }
