import { createZodDto } from 'nestjs-zod'
import {
  CreateNotificationBodySchema,
  CreateNotificationResSchema,
  GetNotificationDetailResSchema,
  GetNotificationParamsSchema,
  GetRewardByLeaderboardParamsSchema,
  UpdateNotificationBodySchema,
  UpdateNotificationResSchema
} from '../entities/notification.entity'

// Request DTOs
export class CreateNotificationBodyDTO extends createZodDto(
  CreateNotificationBodySchema
) {}

export class UpdateNotificationBodyDTO extends createZodDto(
  UpdateNotificationBodySchema
) {}

export class GetNotificationParamsDTO extends createZodDto(GetNotificationParamsSchema) {}

export class GetRewardByLeaderboardParamsDTO extends createZodDto(
  GetRewardByLeaderboardParamsSchema
) {}

// Response DTOs
export class CreateNotificationResDTO extends createZodDto(CreateNotificationResSchema) {}
export class UpdateNotificationResDTO extends createZodDto(UpdateNotificationResSchema) {}
export class GetNotificationDetailResDTO extends createZodDto(
  GetNotificationDetailResSchema
) {}
