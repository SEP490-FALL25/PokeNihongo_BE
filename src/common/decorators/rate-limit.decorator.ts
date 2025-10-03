import { SetMetadata } from '@nestjs/common'

export const RATE_LIMIT_KEY = 'rateLimit'

export interface RateLimitOptions {
  windowMs: number // thời gian window (ms)
  max: number // số lượng request tối đa trong window
  keyGenerator?: (req: any) => string // function để tạo key unique cho rate limit
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options)
