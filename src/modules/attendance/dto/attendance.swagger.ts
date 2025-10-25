import {
  AttendancesStatus,
  AttendancesStatusType
} from '@/common/constants/attendance.constant'
import { ApiProperty } from '@nestjs/swagger'

export class AttendanceDTO {
  @ApiProperty({ example: 1, description: 'ID của bản ghi điểm danh' })
  id: number

  @ApiProperty({
    example: '2025-10-09T00:00:00.000Z',
    description: 'Ngày điểm danh (YYYY-MM-DD hoặc ISO datetime)'
  })
  date: Date

  @ApiProperty({
    enum: AttendancesStatus,
    example: AttendancesStatus.PRESENT,
    description: 'Trạng thái điểm danh'
  })
  status: AttendancesStatusType

  @ApiProperty({ example: 10, description: 'Số xu nhận được trong ngày' })
  coin: number

  @ApiProperty({ example: 5, description: 'Số xu thưởng thêm (bonus)' })
  bonusCoin: number

  @ApiProperty({ example: 1, description: 'ID người dùng điểm danh' })
  userId: number

  @ApiProperty({ example: 1, nullable: true, description: 'Người tạo bản ghi (nếu có)' })
  createdById: number | null

  @ApiProperty({
    example: 1,
    nullable: true,
    description: 'Người cập nhật bản ghi (nếu có)'
  })
  updatedById: number | null

  @ApiProperty({ example: 1, nullable: true, description: 'Người xóa bản ghi (nếu có)' })
  deletedById: number | null

  @ApiProperty({
    example: null,
    nullable: true,
    description: 'Thời gian xóa mềm (soft delete)'
  })
  deletedAt: Date | null

  @ApiProperty({
    example: '2025-10-09T10:02:47.773Z',
    description: 'Thời gian tạo bản ghi'
  })
  createdAt: Date

  @ApiProperty({
    example: '2025-10-09T10:02:47.773Z',
    description: 'Thời gian cập nhật bản ghi gần nhất'
  })
  updatedAt: Date
}
