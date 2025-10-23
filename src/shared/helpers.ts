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
