import { createZodDto } from 'nestjs-zod'
import {
  CreateAttendanceConfigBodySchema,
  CreateAttendanceConfigResSchema,
  GetAttendanceConfigResSchema,
  GetParamsAttendanceConfigSchema,
  UpdateAttendanceConfigBodySchema,
  UpdateAttendanceConfigResSchema
} from '../entities/attendence-config.entity'

export class CreateAttendanceConfigBodyDTO extends createZodDto(
  CreateAttendanceConfigBodySchema
) {}
export class CreateAttendanceConfigResDTO extends createZodDto(
  CreateAttendanceConfigResSchema
) {}
export class UpdateAttendanceConfigBodyDTO extends createZodDto(
  UpdateAttendanceConfigBodySchema
) {}
export class UpdateAttendanceConfigResDTO extends createZodDto(
  UpdateAttendanceConfigResSchema
) {}
export class GetParamsAttendanceConfigDTO extends createZodDto(
  GetParamsAttendanceConfigSchema
) {}
export class GetAttendanceConfigResDTO extends createZodDto(
  GetAttendanceConfigResSchema
) {}
