import { BadRequestException } from '@nestjs/common'

export type QSResult = {
  where?: Record<string, any>
  orderBy?: Record<string, 'asc' | 'desc'>
}

/**
 * parseQs hỗ trợ:
 * - sort:id hoặc sort:-id
 * - name:like=B
 * - startDate:gte=2025-10-25
 * - status=PREVIEW
 * - status:in=ACTIVE,PREVIEW
 */
export function parseQs(
  qs?: string,
  validFields?: string[],
  relationFields: string[] = [],
  arrayFields: string[] = [],
  enumFields: string[] = [] // 👈 thêm enumFields
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
    lte: 'lte',
    in: 'in',
    notIn: 'notIn'
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
    let parsedValue: any
    if (value.includes('|')) {
      parsedValue = value.split('|').map(parseSingleValue)
    } else if (value.includes(',')) {
      parsedValue = value.split(',').map(parseSingleValue)
    } else {
      parsedValue = parseSingleValue(value)
    }

    function parseSingleValue(v: string) {
      if (v === 'true') return true
      if (v === 'false') return false
      if (!isNaN(Number(v))) return Number(v)
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00Z`)
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) {
        const d = new Date(v)
        if (!isNaN(d.getTime())) return d
      }
      const d = new Date(v)
      if (!isNaN(d.getTime())) return d
      return v
    }

    // --- Relation fields ---
    if (relationFields.includes(field)) {
      let targetField = 'id'
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

    // --- Array fields (tránh enum) ---
    const isArrayField =
      (arrayFields.includes(field) ||
        (field.endsWith('Ids') && !relationFields.includes(field))) &&
      !enumFields.includes(field)

    if (isArrayField) {
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

    // --- JSON fields ---
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

    // --- Normal or enum fields ---
    const prismaOp = operatorMap[opOrOption] || 'equals'

    if (['in', 'notIn'].includes(opOrOption)) {
      const values =
        typeof parsedValue === 'string'
          ? parsedValue.split('|').map((v) => v.trim()) // 👈 đổi từ ',' sang '|'
          : Array.isArray(parsedValue)
            ? parsedValue
            : [parsedValue]

      where[field] = { [prismaOp]: values }
    } else if (opOrOption === 'like') {
      where[field] = { [prismaOp]: parsedValue, mode: 'insensitive' }
    } else {
      where[field] = { [prismaOp]: parsedValue }
    }
  }

  return { where, orderBy }
}
