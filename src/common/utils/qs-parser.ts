import { BadRequestException } from '@nestjs/common'

export function parseQs(
  qs?: string,
  validFields?: string[]
): {
  where?: Record<string, any>
  orderBy?: Record<string, 'asc' | 'desc'>
} {
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
      const rawField = part.slice(5) // bỏ "sort:"
      const field = rawField.startsWith('-') ? rawField.slice(1) : rawField

      if (validFields && !validFields.includes(field)) {
        throw new BadRequestException(`Sai thuộc tính: ${field}`)
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
      throw new Error(`Invalid filter field: ${field}`)
    }

    if (tokens.length === 1) {
      // field=value
      where[field] = isNaN(Number(value)) ? value : Number(value)
    } else if (tokens.length === 2) {
      // field:op=value
      const op = tokens[1]
      if (op === 'eq') {
        where[field] = isNaN(Number(value)) ? value : Number(value)
      }
      if (op === 'like') {
        where[field] = { contains: value, mode: 'insensitive' }
      }
    }
  }

  return { where, orderBy }
}
