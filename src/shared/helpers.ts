import { WeekDay, WeekDayType } from '@/common/constants/attendence-config.constant'
import { Prisma } from '@prisma/client'
import { randomInt } from 'crypto'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

// Type Predicate
export function isUniqueConstraintPrismaError(
  error: any
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

export function isNotFoundPrismaError(
  error: any
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

export function isForeignKeyConstraintPrismaError(
  error: any
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003'
}

export const generateOTP = () => {
  return String(randomInt(100000, 1000000))
}

export const generateRandomFilename = (filename: string) => {
  const ext = path.extname(filename)
  return `${uuidv4()}${ext}`
}

export function todayUTCFromVN() {
  const now = new Date()

  // Lấy ngày hiện tại ở múi giờ VN
  const vnYear = now.getUTCFullYear()
  const vnMonth = now.getUTCMonth()
  const vnDate = now.getUTCDate()
  now.setHours(0, 0, 0, 0)
  now.setHours(now.getHours() + 7)

  // 0h VN
  return now
}

export function mapConditionMeta(meta?: { type?: number } | null) {
  if (!meta) return Prisma.JsonNull
  return meta
}

export function getWeekDay(date: Date): WeekDayType {
  const days: WeekDayType[] = [
    WeekDay.SUNDAY, // 0
    WeekDay.MONDAY, // 1
    WeekDay.TUESDAY, // 2
    WeekDay.WEDNESDAY, // 3
    WeekDay.THURSDAY, // 4
    WeekDay.FRIDAY, // 5
    WeekDay.SATURDAY // 6
  ]

  return days[date.getDay()]
}

export function todayUTCWith0000() {
  const now = new Date()

  // Lấy thành phần ngày/tháng/năm theo UTC
  const vnYear = now.getUTCFullYear()
  const vnMonth = now.getUTCMonth() // chú ý: tháng trong JS bắt đầu từ 0
  const vnDate = now.getUTCDate()

  // Tạo 1 Date mới ở mốc 00:00:00 UTC
  const dateUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate, 0, 0, 0, 0))

  // 0h VN
  return dateUTC
}

export function todayUTCWith0000ByDate(inputDate: Date) {
  const now = inputDate

  // Lấy thành phần ngày/tháng/năm theo UTC
  const vnYear = now.getUTCFullYear()
  const vnMonth = now.getUTCMonth() // chú ý: tháng trong JS bắt đầu từ 0
  const vnDate = now.getUTCDate()

  // Tạo 1 Date mới ở mốc 00:00:00 UTC
  const dateUTC = new Date(Date.UTC(vnYear, vnMonth, vnDate, 0, 0, 0, 0))

  // 0h VN
  return dateUTC
}

export function addDaysUTC0000(date, days) {
  const utc = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + days,
    0, // giờ = 0
    0, // phút = 0
    0, // giây = 0
    0 // mili-giây = 0
  )
  return new Date(utc)
}
