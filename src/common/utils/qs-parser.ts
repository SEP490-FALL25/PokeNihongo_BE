import { BadRequestException } from '@nestjs/common'

type QSResult = {
  where?: Record<string, any>
  orderBy?: Record<string, 'asc' | 'desc'>
}

export function parseQs(
  qs?: string,
  validFields?: string[],
  relationFields: string[] = [], // relation array fields
  arrayFields: string[] = [] // scalar array fields
): QSResult {
  if (!qs) return {}

  const where: Record<string, any> = {}
  let orderBy: Record<string, 'asc' | 'desc'> | undefined

  const parts = qs
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  for (const part of parts) {
    // --- SORT ---
    if (part.startsWith('sort:')) {
      const rawField = part.slice(5)
      const field = rawField.startsWith('-') ? rawField.slice(1) : rawField

      if (validFields && !validFields.includes(field)) {
        throw new BadRequestException(
          `Not valid field: ${field}. All field need in: ${validFields.join(', ')}`
        )
      }

      orderBy = rawField.startsWith('-') ? { [field]: 'desc' } : { [field]: 'asc' }
      continue
    }

    // --- FILTER ---
    const [left, value] = part.split('=')
    if (!left || value === undefined) continue

    const tokens = left.split(':')
    const field = tokens[0]

    if (validFields && !validFields.includes(field)) {
      throw new BadRequestException(
        `Not valid field: ${field}. All field need in: ${validFields.join(', ')}`
      )
    }

    // --- Parse giá trị ---
    let parsedValue: any
    if (value.includes('|')) {
      parsedValue = value.split('|').map((v) => {
        if (v === 'true') return true
        if (v === 'false') return false
        if (!isNaN(Number(v))) return Number(v)
        return v
      })
    } else {
      if (value === 'true') parsedValue = true
      else if (value === 'false') parsedValue = false
      else if (!isNaN(Number(value))) parsedValue = Number(value)
      else parsedValue = value
    }

    // --- Relation array field (Prisma "some") ---
    if (relationFields.includes(field)) {
      if (Array.isArray(parsedValue)) {
        where[field] = { some: { type_name: { in: parsedValue } } }
      } else {
        where[field] = { some: { type_name: parsedValue } }
      }
      continue
    }

    // --- Scalar array field ---
    if (arrayFields.includes(field)) {
      if (Array.isArray(parsedValue)) {
        where[field] = { hasSome: parsedValue } // Prisma array filter
      } else {
        where[field] = { has: parsedValue }
      }
      continue
    }

    // --- Scalar normal field ---
    if (tokens.length === 1) {
      where[field] = parsedValue
    } else if (tokens.length === 2) {
      const op = tokens[1]
      if (op === 'eq') where[field] = parsedValue
      else if (op === 'like') where[field] = { contains: value, mode: 'insensitive' }
    }
  }

  return { where, orderBy }
}
