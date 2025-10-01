import {
  RATE_LIMIT_KEY,
  RateLimitOptions
} from '@/common/decorators/rate-limit.decorator'
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import Redis from 'ioredis'

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitOptions = this.reflector.get<RateLimitOptions>(
      RATE_LIMIT_KEY,
      context.getHandler()
    )

    if (!rateLimitOptions) {
      return true // Nếu không có rate limit config thì cho phép
    }

    const request = context.switchToHttp().getRequest()
    const { windowMs, max, keyGenerator } = rateLimitOptions

    // Tạo key unique cho rate limit
    let key: string
    if (keyGenerator) {
      key = keyGenerator(request)
    } else {
      // Default key: IP + route + method
      const ip = request.ip || request.connection.remoteAddress
      const route = request.route?.path || request.url
      const method = request.method
      key = `rate_limit:${ip}:${method}:${route}`
    }

    // Kiểm tra và cập nhật số lượng request
    const current = await this.redisClient.get(key)
    const requests = current ? parseInt(current) : 0

    if (requests >= max) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Quá nhiều yêu cầu. Vui lòng thử lại sau ${Math.ceil(windowMs / 1000)} giây.`,
          error: 'Too Many Requests'
        },
        HttpStatus.TOO_MANY_REQUESTS
      )
    }

    // Tăng counter
    const pipeline = this.redisClient.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, Math.ceil(windowMs / 1000))
    await pipeline.exec()

    return true
  }
}
