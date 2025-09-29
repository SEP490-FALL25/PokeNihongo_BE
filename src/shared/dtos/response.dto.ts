import { createZodDto } from 'nestjs-zod'
import {
  MessageResSchema,
  PaginationResponseSchema
} from 'src/shared/models/response.model'

export class MessageResDTO extends createZodDto(MessageResSchema) {}

export class PaginationResponseDTO extends createZodDto(PaginationResponseSchema) {}
