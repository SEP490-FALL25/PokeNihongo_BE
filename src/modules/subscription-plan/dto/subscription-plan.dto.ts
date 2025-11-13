import { createZodDto } from 'nestjs-zod'
import {
  CreateSubscriptionPlanBodySchema,
  CreateSubscriptionPlanResSchema,
  GetSubscriptionPlanDetailResSchema,
  GetSubscriptionPlanParamsSchema,
  UpdateSubscriptionPlanBodySchema,
  UpdateSubscriptionPlanResSchema,
  UpdateWithListItemResSchema
} from '../entities/subscription-plan.entity'

// Request DTOs
export class CreateSubscriptionPlanBodyDTO extends createZodDto(
  CreateSubscriptionPlanBodySchema
) {}

export class UpdateSubscriptionPlanBodyDTO extends createZodDto(
  UpdateSubscriptionPlanBodySchema
) {}

export class GetSubscriptionPlanParamsDTO extends createZodDto(
  GetSubscriptionPlanParamsSchema
) {}

// Response DTOs
export class CreateSubscriptionPlanResDTO extends createZodDto(
  CreateSubscriptionPlanResSchema
) {}
export class UpdateSubscriptionPlanResDTO extends createZodDto(
  UpdateSubscriptionPlanResSchema
) {}
export class UpdateWithListItemResDTO extends createZodDto(UpdateWithListItemResSchema) {}
export class GetSubscriptionPlanDetailResDTO extends createZodDto(
  GetSubscriptionPlanDetailResSchema
) {}
