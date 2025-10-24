import { Module } from '@nestjs/common'
import { TestSetController } from './testset.controller'
import { TestSetService } from './testset.service'
import { TestSetRepository } from './testset.repo'
import { PrismaService } from '@/shared/services/prisma.service'

@Module({
    imports: [],
    controllers: [TestSetController],
    providers: [TestSetService, TestSetRepository, PrismaService],
    exports: [TestSetService, TestSetRepository],
})
export class TestSetModule { }
