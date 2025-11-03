import { Module } from '@nestjs/common'
import { TestController } from './test.controller'
import { TestService } from './test.service'
import { TestRepository } from './test.repo'
import { PrismaService } from '@/shared/services/prisma.service'
import { TranslationModule } from '../translation/translation.module'
import { LanguagesModule } from '../languages/languages.module'
import { TestSetModule } from '../testset/testset.module'
import { TestSetQuestionBankModule } from '../testset-questionbank/testset-questionbank.module'
import { UserTestAttemptRepository } from '../user-test-attempt/user-test-attempt.repo'
import { UserTestRepository } from '../user-test/user-test.repo'

@Module({
    imports: [TranslationModule, LanguagesModule, TestSetModule, TestSetQuestionBankModule],
    controllers: [TestController],
    providers: [TestService, TestRepository, PrismaService, UserTestAttemptRepository, UserTestRepository],
    exports: [TestService, TestRepository],
})
export class TestModule { }

