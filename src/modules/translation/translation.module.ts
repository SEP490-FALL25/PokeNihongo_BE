import { Module } from '@nestjs/common'
import { TranslationController } from './translation.controller'
import { TranslationService } from './translation.service'
import { TranslationRepository } from './translation.repo'

@Module({
    controllers: [TranslationController],
    providers: [TranslationService, TranslationRepository],
    exports: [TranslationService, TranslationRepository]
})
export class TranslationModule { }
