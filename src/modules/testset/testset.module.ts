import { Module } from '@nestjs/common'
import { TestSetController } from './testset.controller'
import { TestSetService } from './testset.service'
import { TestSetRepository } from './testset.repo'
import { PrismaService } from '@/shared/services/prisma.service'
import { TranslationModule } from '../translation/translation.module'
import { LanguagesModule } from '../languages/languages.module'

@Module({
    imports: [TranslationModule, LanguagesModule],
    controllers: [TestSetController],
    providers: [TestSetService, TestSetRepository, PrismaService],
    exports: [TestSetService, TestSetRepository],
})
export class TestSetModule { }
