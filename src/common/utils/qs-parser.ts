import { BadRequestException } from '@nestjs/common'

export type QSResult = {
  where?: Record<string, any>
  orderBy?: Record<string, 'asc' | 'desc'>
}

/**
 * parseQs
 * @param qs query string, ví dụ:
 * qs=sort:-createdAt,rarity:eq=LEGENDARY,types:some=1|2,nameTranslations.vi:like=Shishiko
 * @param validFields danh sách field hợp lệ
 * @param relationFields array của relation fields (Prisma some)
 * @param arrayFields array của scalar array fields (Prisma has/hasSome)
 */
export function parseQs(
  qs?: string,
  validFields?: string[],
  relationFields: string[] = [],
  arrayFields: string[] = []
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
          `Not valid field: ${field}. All field need in: ${validFields.join(' ')}`
        )
      }

      orderBy = rawField.startsWith('-') ? { [field]: 'desc' } : { [field]: 'asc' }
      continue
    }

    // --- FILTER ---
    const [left, value] = part.split('=')
    if (!left || value === undefined) continue

    const tokens = left.split(':') // [field, operator/option]
    const field = tokens[0]
    const opOrOption = tokens[1] || 'eq'

    if (validFields && !validFields.includes(field)) {
      throw new BadRequestException(
        `Not valid field: ${field}. All field need in: ${validFields.join(' ')}`
      )
    }

    // --- Parse value ---
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

    // --- Relation array field (Prisma some) ---
    if (relationFields.includes(field)) {
      let targetField = 'id'
      if (field === 'types')
        targetField =
          typeof parsedValue === 'number' ||
          (Array.isArray(parsedValue) && typeof parsedValue[0] === 'number')
            ? 'id'
            : 'type_name'

      if (Array.isArray(parsedValue)) {
        where.AND = where.AND || []
        for (const val of parsedValue) {
          where.AND.push({ [field]: { some: { [targetField]: val } } })
        }
      } else {
        where[field] = { some: { [targetField]: parsedValue } }
      }
      continue
    }

    // --- Scalar array fields ---
    const arrayFieldPatterns = [
      'rarities',
      'tags',
      'categories',
      'skills',
      'abilities',
      'items',
      'languages',
      'statuses',
      'codes',
      'values'
    ]
    const isAutoArrayField = arrayFieldPatterns.some(
      (pattern) =>
        field === pattern ||
        field.endsWith('Ids') ||
        (field.endsWith('s') && !relationFields.includes(field))
    )

    if (arrayFields.includes(field) || isAutoArrayField) {
      if (Array.isArray(parsedValue)) {
        // OR logic
        where.OR = where.OR || []
        for (const val of parsedValue) {
          where.OR.push({ [field]: { has: val } })
        }
      } else {
        where[field] = { has: parsedValue }
      }
      continue
    }

    // --- Nested JSON fields ---
    if (field.includes('.')) {
      const [root, nested] = field.split('.')
      if (opOrOption === 'like') {
        where[root] = {
          path: [nested],
          string_contains: parsedValue,
          mode: 'insensitive'
        }
      } else {
        where[root] = { path: [nested], equals: parsedValue }
      }
      continue
    }

    // --- Scalar normal fields ---
    if (opOrOption === 'like') {
      where[field] = { contains: parsedValue, mode: 'insensitive' }
    } else {
      where[field] = parsedValue
    }
  }

  return { where, orderBy }
}
