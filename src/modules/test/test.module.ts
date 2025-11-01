import { Module } from '@nestjs/common'
import { TestController } from './test.controller'
import { TestService } from './test.service'
import { TestRepository } from './test.repo'
import { PrismaService } from '@/shared/services/prisma.service'
import { TranslationModule } from '../translation/translation.module'
import { LanguagesModule } from '../languages/languages.module'

@Module({
    imports: [TranslationModule, LanguagesModule],
    controllers: [TestController],
    providers: [TestService, TestRepository, PrismaService],
    exports: [TestService, TestRepository],
})
export class TestModule { }

