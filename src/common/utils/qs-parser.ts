import { BadRequestException } from '@nestjs/common'

export type QSResult = {
  where?: Record<string, any>
  orderBy?: Record<string, 'asc' | 'desc'>
}

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

  const operatorMap: Record<string, string> = {
    eq: 'equals',
    like: 'contains',
    gt: 'gt',
    gte: 'gte',
    lt: 'lt',
    lte: 'lte'
  }

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

    const tokens = left.split(':')
    const field = tokens[0]
    const opOrOption = tokens[1] || 'eq'

    if (validFields && !validFields.includes(field)) {
      throw new BadRequestException(
        `Not valid field: ${field}. All field need in: ${validFields.join(' ')}`
      )
    }

    // --- Parse value ---
    // --- Parse value ---
    let parsedValue: any
    if (value.includes('|')) {
      parsedValue = value.split('|').map((v) => parseSingleValue(v))
    } else {
      parsedValue = parseSingleValue(value)
    }

    function parseSingleValue(v: string) {
      if (v === 'true') return true
      if (v === 'false') return false
      if (!isNaN(Number(v))) return Number(v)

      // ✅ Nếu là chuỗi dạng YYYY-MM-DD → parse về Date (0h00 UTC)
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00Z`)

      // ✅ Nếu là dạng đầy đủ có giờ phút giây (ISO hoặc tương tự)
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?/.test(v)) {
        const d = new Date(v)
        if (!isNaN(d.getTime())) return d
      }

      // ✅ Nếu là chuỗi ISO hợp lệ bất kỳ
      const tryDate = new Date(v)
      if (!isNaN(tryDate.getTime())) return tryDate

      return v
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
    const prismaOp = operatorMap[opOrOption] || 'equals'

    if (opOrOption === 'like') {
      where[field] = { [prismaOp]: parsedValue, mode: 'insensitive' }
    } else {
      where[field] = { [prismaOp]: parsedValue }
    }
  }

  return { where, orderBy }
}
