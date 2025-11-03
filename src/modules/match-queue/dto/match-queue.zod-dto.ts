import { createZodDto } from 'nestjs-zod'
import {
  CreateMatchQueueBodySchema,
  CreateMatchQueueResSchema,
  GetMatchQueueDetailResSchema,
  GetMatchQueueParamsSchema,
  UpdateMatchQueueBodySchema,
  UpdateMatchQueueResSchema
} from '../entities/match-queue.entity'

export class CreatedMatchQueueBodyDTO extends createZodDto(CreateMatchQueueBodySchema) {}

export class CreateMatchQueueResDTO extends createZodDto(CreateMatchQueueResSchema) {}

export class UpdateMatchQueueBodyDTO extends createZodDto(UpdateMatchQueueBodySchema) {}

export class UpdateMatchQueueResDTO extends createZodDto(UpdateMatchQueueResSchema) {}

export class GetMatchQueueParamsDTO extends createZodDto(GetMatchQueueParamsSchema) {}

export class GetMatchQueueDetailResDTO extends createZodDto(
  GetMatchQueueDetailResSchema
) {}
