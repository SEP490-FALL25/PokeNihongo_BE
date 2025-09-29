import { z } from 'zod'

export const EmptyBodySchema = z.object({}).strict()

export const PaginationQuerySchema = z.object({
  currentPage: z.coerce.number().int().positive().default(1), // Phải thêm coerce để chuyển từ string sang number
  pageSize: z.coerce.number().int().positive().default(10), // Phải thêm coerce để chuyển từ string sang number
  qs: z.string().optional()
})

export type PaginationQueryType = z.infer<typeof PaginationQuerySchema>
export type EmptyBodyType = z.infer<typeof EmptyBodySchema>
