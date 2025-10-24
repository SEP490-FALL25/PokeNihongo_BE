import { createZodDto } from 'nestjs-zod'
import {
  CreateAttendanceBodySchema,
  CreateAttendanceResSchema,
  GetAttendanceResSchema,
  GetAttendanceWithUserStreakResSchema,
  GetParamsAttendanceSchema,
  GetParamsDateAttendanceSchema,
  UpdateAttendanceBodySchema,
  UpdateAttendanceResSchema
} from '../entities/attendance.entity'

export class CreateAttendanceBodyDTO extends createZodDto(CreateAttendanceBodySchema) {}
export class CreateAttendanceResDTO extends createZodDto(CreateAttendanceResSchema) {}
export class UpdateAttendanceBodyDTO extends createZodDto(UpdateAttendanceBodySchema) {}
export class UpdateAttendanceResDTO extends createZodDto(UpdateAttendanceResSchema) {}
export class GetParamsAttendanceDTO extends createZodDto(GetParamsAttendanceSchema) {}
export class GetParamsDateAttendanceDTO extends createZodDto(
  GetParamsDateAttendanceSchema
) {}
export class GetAttendanceResDTO extends createZodDto(GetAttendanceResSchema) {}
export class GetAttendanceWithUserStreakResDTO extends createZodDto(
  GetAttendanceWithUserStreakResSchema
) {}
