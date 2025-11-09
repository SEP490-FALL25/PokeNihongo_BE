import { createZodDto } from 'nestjs-zod'
import {
    GetHistoryListQuerySchema,
    GetAdminHistoryListQuerySchema,
    HistoryListResSchema,
    AdminHistoryListResSchema
} from '../entities/user-history.entities'

export class GetHistoryListQueryDTO extends createZodDto(GetHistoryListQuerySchema) { }
export class GetAdminHistoryListQueryDTO extends createZodDto(GetAdminHistoryListQuerySchema) { }
export class HistoryListResDTO extends createZodDto(HistoryListResSchema) { }
export class AdminHistoryListResDTO extends createZodDto(AdminHistoryListResSchema) { }

