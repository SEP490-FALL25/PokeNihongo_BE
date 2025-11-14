import { createZodDto } from 'nestjs-zod'
import {
  CreateSubscriptionBodyInputSchema,
  CreateSubscriptionResSchema,
  GetLeaderboardWithRewardSeasonDetailResSchema,
  GetMarketplaceListResSchema,
  GetMarketplaceOptionsResSchema,
  GetSubscriptionDetailResSchema,
  GetSubscriptionDetailWithAllLangResSchema,
  GetSubscriptionParamsSchema,
  UpdateSubscriptionBodyInputSchema,
  UpdateSubscriptionResSchema
} from '../entities/subscription.entity'

export class CreatedSubscriptionBodyInputDTO extends createZodDto(
  CreateSubscriptionBodyInputSchema
) {}

export class CreateSubscriptionResDTO extends createZodDto(CreateSubscriptionResSchema) {}

export class UpdateSubscriptionBodyInputDTO extends createZodDto(
  UpdateSubscriptionBodyInputSchema
) {}

export class UpdateSubscriptionResDTO extends createZodDto(UpdateSubscriptionResSchema) {}

export class GetSubscriptionParamsDTO extends createZodDto(GetSubscriptionParamsSchema) {}

export class GetSubscriptionDetailResDTO extends createZodDto(
  GetSubscriptionDetailResSchema
) {}

export class GetSubscriptionDetailWithAllLangResDTO extends createZodDto(
  GetSubscriptionDetailWithAllLangResSchema
) {}

export class GetLeaderboardWithRewardSeasonDetailResDTO extends createZodDto(
  GetLeaderboardWithRewardSeasonDetailResSchema
) {}

export class GetMarketplaceListResDTO extends createZodDto(GetMarketplaceListResSchema) {}

export class GetMarketplaceOptionsResDTO extends createZodDto(
  GetMarketplaceOptionsResSchema
) {}
