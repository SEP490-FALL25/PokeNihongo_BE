import { createZodDto } from 'nestjs-zod'
import {
    GetHistoryListQuerySchema,
    HistoryListResSchema
} from '../entities/user-history.entities'

export class GetHistoryListQueryDTO extends createZodDto(GetHistoryListQuerySchema) { }
export class HistoryListResDTO extends createZodDto(HistoryListResSchema) { }

