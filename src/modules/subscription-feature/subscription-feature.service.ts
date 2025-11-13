import { FeatureKey } from '@/common/constants/subscription.constant'
import { I18nService } from '@/i18n/i18n.service'
import { SubscriptionFeatureMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { Injectable } from '@nestjs/common'
import { SubscriptionRepo } from '../subscription/subscription.repo'
import {
  InvalidValueForCoinMultiplierExistsException,
  InvalidValueForXPMultiplierExistsException,
  SubscriptionFeatureNotFoundException
} from './dto/subscription-feature.error'
import {
  CreateSubscriptionFeatureBodyType,
  UpdateSubscriptionFeatureBodyType,
  UpdateWithListItemBodyType
} from './entities/subscription-feature.entity'
import { SubscriptionFeatureRepo } from './subscription-feature.repo'

@Injectable()
export class SubscriptionFeatureService {
  constructor(
    private subscriptionFeatureRepo: SubscriptionFeatureRepo,
    private readonly subRepo: SubscriptionRepo,
    private readonly i18nService: I18nService
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.subscriptionFeatureRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(
        SubscriptionFeatureMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const subscriptionFeature = await this.subscriptionFeatureRepo.findById(id)
    if (!subscriptionFeature) {
      throw new SubscriptionFeatureNotFoundException()
    }

    return {
      statusCode: 200,
      data: subscriptionFeature,
      message: this.i18nService.translate(
        SubscriptionFeatureMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateSubscriptionFeatureBodyType },
    lang: string = 'vi'
  ) {
    try {
      // Validate numeric multiplier features for create
      if (
        data.featureKey === FeatureKey.COIN_MULTIPLIER ||
        data.featureKey === FeatureKey.XP_MULTIPLIER
      ) {
        const num = Number(data.value)
        if (!data.value || !Number.isFinite(num) || num < 1) {
          if (data.featureKey === FeatureKey.COIN_MULTIPLIER) {
            throw new InvalidValueForCoinMultiplierExistsException()
          } else {
            throw new InvalidValueForXPMultiplierExistsException()
          }
        }
        data.value = num.toString()
      }
      const result = await this.subscriptionFeatureRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(
          SubscriptionFeatureMessage.CREATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: UpdateSubscriptionFeatureBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      // Fetch existing if needed for validation (when only value changed)
      const existing = await this.subscriptionFeatureRepo.findById(id)
      if (!existing) {
        throw new SubscriptionFeatureNotFoundException()
      }
      const effectiveFeatureKey = data.featureKey || existing.featureKey
      if (
        effectiveFeatureKey === FeatureKey.COIN_MULTIPLIER ||
        effectiveFeatureKey === FeatureKey.XP_MULTIPLIER
      ) {
        // Determine value to validate (new value or existing if unchanged?) Only validate new value if provided
        if (data.value !== undefined) {
          const num = Number(data.value)
          if (!data.value || !Number.isFinite(num) || num < 1) {
            if (effectiveFeatureKey === FeatureKey.COIN_MULTIPLIER) {
              throw new InvalidValueForCoinMultiplierExistsException()
            } else {
              throw new InvalidValueForXPMultiplierExistsException()
            }
          }
          data.value = num.toString()
        }
      }
      const subscriptionFeature = await this.subscriptionFeatureRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: subscriptionFeature,
        message: this.i18nService.translate(
          SubscriptionFeatureMessage.UPDATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new SubscriptionFeatureNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existSubscriptionFeature = await this.subscriptionFeatureRepo.findById(id)
      if (!existSubscriptionFeature) {
        throw new SubscriptionFeatureNotFoundException()
      }

      await this.subscriptionFeatureRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(
          SubscriptionFeatureMessage.DELETE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new SubscriptionFeatureNotFoundException()
      }
      throw error
    }
  }

  async updateWithListFeature(
    {
      subscriptionId,
      updatedById,
      data
    }: {
      subscriptionId: number
      updatedById: number
      data: UpdateWithListItemBodyType
    },
    lang: string = 'vi'
  ) {
    try {
      const isExistSubscription = await this.subRepo.findById(subscriptionId)
      if (!isExistSubscription) {
        throw new NotFoundRecordException()
      }
      const created = await this.subscriptionFeatureRepo.withTransaction(async (tx) => {
        const { items } = data

        // 1. Delete existing subscription features for subscriptionId
        await tx.subscriptionFeature.deleteMany({
          where: { subscriptionId }
        })

        // 2. Prepare data for createMany
        const createData = items.map((item) => ({
          subscriptionId,
          featureKey: item.featureKey,
          value: item.value,
          createdById: updatedById,
          updatedById
        }))

        // Validate numeric multiplier features: must be a number >= 1 with specific error classes
        for (const item of createData) {
          if (item.featureKey === FeatureKey.COIN_MULTIPLIER) {
            const num = Number(item.value)
            if (!item.value || !Number.isFinite(num) || num < 1) {
              throw new InvalidValueForCoinMultiplierExistsException()
            }
            item.value = num.toString()
          } else if (item.featureKey === FeatureKey.XP_MULTIPLIER) {
            const num = Number(item.value)
            if (!item.value || !Number.isFinite(num) || num < 1) {
              throw new InvalidValueForXPMultiplierExistsException()
            }
            item.value = num.toString()
          }
        }

        // 3. Create all features at once
        await tx.subscriptionFeature.createMany({
          data: createData
        })

        // 4. Re-fetch created data
        return await tx.subscriptionFeature.findMany({
          where: { subscriptionId, deletedAt: null },
          orderBy: { id: 'asc' }
        })
      })

      return {
        statusCode: 200,
        data: created,
        message: this.i18nService.translate(
          SubscriptionFeatureMessage.UPDATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
