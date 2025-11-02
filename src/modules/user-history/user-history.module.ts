import { Module } from '@nestjs/common'
import { UserHistoryController } from './user-history.controller'
import { UserHistoryService } from './user-history.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { I18nModule } from '@/i18n/i18n.module'

@Module({
    imports: [I18nModule],
    controllers: [UserHistoryController],
    providers: [UserHistoryService, PrismaService],
    exports: [UserHistoryService]
})
export class UserHistoryModule { }

