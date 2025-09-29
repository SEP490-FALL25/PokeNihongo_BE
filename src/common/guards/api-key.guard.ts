import envConfig from '@/config/env.config'
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'

@Injectable()
export class APIKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const xAPIKey = request.headers['x-api-key']
    if (xAPIKey !== envConfig.SECRET_API_KEY) {
      throw new UnauthorizedException()
    }
    return true
  }
}
