import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreateAttendanceResDTO,
  GetAttendanceResDTO,
  GetAttendanceWithUserStreakResDTO,
  GetParamsAttendanceDTO,
  GetParamsDateAttendanceDTO,
  UpdateAttendanceBodyDTO,
  UpdateAttendanceResDTO
} from 'src/modules/attendance/dto/attendance.zod-dto'

import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { ApiBearerAuth } from '@nestjs/swagger'
import { MessageResDTO } from 'src/shared/dtos/response.dto'
import { AttendanceService } from './attendance.service'

@Controller('attendance')
@ApiBearerAuth()
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.attendanceService.list(query, lang)
  }

  @Get('user')
  @ZodSerializerDto(GetAttendanceWithUserStreakResDTO)
  findByUser(
    @Param() params: GetParamsDateAttendanceDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.attendanceService.findByUserWeek(userId, params.date, lang)
  }

  @Get(':attendanceId')
  @ZodSerializerDto(GetAttendanceResDTO)
  findById(@Param() params: GetParamsAttendanceDTO, @I18nLang() lang: string) {
    return this.attendanceService.findById(params.attendanceId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateAttendanceResDTO)
  create(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.attendanceService.create(
      {
        createdById: userId
      },
      lang
    )
  }

  @Put(':attendanceId')
  @ZodSerializerDto(UpdateAttendanceResDTO)
  update(
    @Body() body: UpdateAttendanceBodyDTO,
    @Param() params: GetParamsAttendanceDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.attendanceService.update(
      {
        data: body,
        id: params.attendanceId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':attendanceId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetParamsAttendanceDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.attendanceService.delete(
      {
        id: params.attendanceId,
        deletedById: userId
      },
      lang
    )
  }
}
