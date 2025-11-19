import {
    CreateUserRewardHistoryBodyType,
    GetUserRewardHistoryListQueryType,
    GetMyRewardHistoryQueryType,
    UpdateUserRewardHistoryBodyType
} from '@/modules/user-reward-history/entities/user-reward-history.entities'
import {
    InvalidUserRewardHistoryDataException,
    USER_REWARD_HISTORY_MESSAGE,
    UserRewardHistoryNotFoundException
} from '@/modules/user-reward-history/dto/user-reward-history.error'
import { UserRewardHistoryRepository } from '@/modules/user-reward-history/user-reward-history.repo'
import { Injectable, Logger, HttpException } from '@nestjs/common'
import { RewardTarget, UserRewardSourceType } from '@prisma/client'

@Injectable()
export class UserRewardHistoryService {
    private readonly logger = new Logger(UserRewardHistoryService.name)

    constructor(private readonly userRewardHistoryRepository: UserRewardHistoryRepository) { }

    // Reusable builder for history payload
    createEntryPayload(params: {
        userId: number
        rewardId?: number
        rewardTargetSnapshot: RewardTarget
        amount?: number | null
        sourceType?: UserRewardSourceType
        note?: string
        meta?: Record<string, any>
        sourceId?: number
    }) {
        return {
            userId: params.userId,
            rewardId: params.rewardId,
            rewardTargetSnapshot: params.rewardTargetSnapshot,
            amount: params.amount ?? null,
            sourceType: params.sourceType ?? 'REWARD_SERVICE',
            note: params.note,
            meta: params.meta,
            sourceId: params.sourceId
        } as CreateUserRewardHistoryBodyType
    }

    appendEntriesFromRewards(
        entries: CreateUserRewardHistoryBodyType[],
        rewards: { id: number; rewardItem: number }[],
        userId: number,
        rewardTarget: RewardTarget,
        sourceType: UserRewardSourceType,
        amountMultiplier: number = 1
    ) {
        for (const reward of rewards) {
            entries.push(
                this.createEntryPayload({
                    userId,
                    rewardId: reward.id,
                    rewardTargetSnapshot: rewardTarget,
                    amount: reward.rewardItem * amountMultiplier,
                    sourceType
                })
            )
        }
    }

    async create(body: CreateUserRewardHistoryBodyType) {
        try {
            const history = await this.userRewardHistoryRepository.create(body)
            return {
                statusCode: 201,
                data: history,
                message: USER_REWARD_HISTORY_MESSAGE.CREATE_SUCCESS
            }
        } catch (error) {
            this.logger.error('Error creating user reward history:', error)
            if (error instanceof HttpException) {
                throw error
            }
            throw InvalidUserRewardHistoryDataException
        }
    }

    async findAll(query: GetUserRewardHistoryListQueryType) {
        const { currentPage, pageSize } = query
        const result = await this.userRewardHistoryRepository.findMany(query)

        return {
            statusCode: 200,
            message: USER_REWARD_HISTORY_MESSAGE.GET_LIST_SUCCESS,
            data: {
                results: result.items,
                pagination: {
                    current: currentPage,
                    pageSize,
                    totalPage: Math.ceil(result.total / pageSize),
                    totalItem: result.total
                }
            }
        }
    }

    async getMy(userId: number, query: GetMyRewardHistoryQueryType) {
        if (!userId) {
            throw InvalidUserRewardHistoryDataException
        }
        const result = await this.userRewardHistoryRepository.findMany({
            ...query,
            userId
        })

        return {
            statusCode: 200,
            message: USER_REWARD_HISTORY_MESSAGE.GET_LIST_SUCCESS,
            data: {
                results: result.items,
                pagination: {
                    current: result.page,
                    pageSize: result.limit,
                    totalPage: Math.ceil(result.total / result.limit),
                    totalItem: result.total
                }
            }
        }
    }

    async findOne(id: number) {
        const history = await this.userRewardHistoryRepository.findUnique(id)
        if (!history) {
            throw UserRewardHistoryNotFoundException
        }
        return {
            data: history,
            message: USER_REWARD_HISTORY_MESSAGE.GET_SUCCESS
        }
    }

    async update(id: number, body: UpdateUserRewardHistoryBodyType) {
        try {
            const existing = await this.userRewardHistoryRepository.findUnique(id)
            if (!existing) {
                throw UserRewardHistoryNotFoundException
            }

            const history = await this.userRewardHistoryRepository.update(id, body)
            return {
                data: history,
                message: USER_REWARD_HISTORY_MESSAGE.UPDATE_SUCCESS
            }
        } catch (error) {
            this.logger.error(`Error updating user reward history ${id}:`, error)
            if (error instanceof HttpException) {
                throw error
            }
            throw InvalidUserRewardHistoryDataException
        }
    }

    async remove(id: number) {
        try {
            const existing = await this.userRewardHistoryRepository.findUnique(id)
            if (!existing) {
                throw UserRewardHistoryNotFoundException
            }

            const history = await this.userRewardHistoryRepository.delete(id)
            return {
                data: history,
                message: USER_REWARD_HISTORY_MESSAGE.DELETE_SUCCESS
            }
        } catch (error) {
            this.logger.error(`Error deleting user reward history ${id}:`, error)
            if (error instanceof HttpException) {
                throw error
            }
            throw InvalidUserRewardHistoryDataException
        }
    }
}


