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
  console.log(now)

  // Lấy ngày hiện tại ở múi giờ VN
  const vnOffset = 7 * 60 // phút
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000) // UTC hiện tại
  const vnDate = new Date(utc.getTime() + vnOffset * 60000)

  // set giờ phút giây = 0
  vnDate.setUTCHours(0, 0, 0, 0)

  // Chuyển về UTC
  return vnDate
}
