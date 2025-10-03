import { Module } from '@nestjs/common'
import { MeaningController } from './meaning.controller'
import { MeaningService } from './meaning.service'
import { MeaningRepository } from './meaning.repo'

@Module({
    controllers: [MeaningController],
    providers: [MeaningService, MeaningRepository],
    exports: [MeaningService, MeaningRepository]
})
export class MeaningModule { }
