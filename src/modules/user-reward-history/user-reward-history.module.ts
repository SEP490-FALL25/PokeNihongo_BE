import { Module } from '@nestjs/common'
import { UserRewardHistoryController } from './user-reward-history.controller'
import { UserRewardHistoryService } from './user-reward-history.service'
import { UserRewardHistoryRepository } from './user-reward-history.repo'

@Module({
    imports: [],
    controllers: [UserRewardHistoryController],
    providers: [UserRewardHistoryService, UserRewardHistoryRepository],
    exports: [UserRewardHistoryService, UserRewardHistoryRepository]
})
export class UserRewardHistoryModule { }

