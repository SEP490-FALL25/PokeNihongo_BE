import envConfig from '@/config/env.config'
import {
  AccessTokenPayload,
  AccessTokenPayloadCreate,
  GuestAccessTokenPayload,
  RefreshTokenPayload,
  RefreshTokenPayloadCreate
} from '@/shared/types/jwt.type'
import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { v4 as uuidv4 } from 'uuid'

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AccessTokenPayloadCreate) {
    return this.jwtService.sign(
      { ...payload, uuid: uuidv4() },
      {
        secret: envConfig.ACCESS_TOKEN_SECRET,
        expiresIn: envConfig.ACCESS_TOKEN_EXPIRES_IN,
        algorithm: 'HS256'
      }
    )
  }

  signRefreshToken(payload: RefreshTokenPayloadCreate) {
    return this.jwtService.sign(
      { ...payload, uuid: uuidv4() },
      {
        secret: envConfig.REFRESH_TOKEN_SECRET,
        expiresIn: envConfig.REFRESH_TOKEN_EXPIRES_IN,
        algorithm: 'HS256'
      }
    )
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: envConfig.ACCESS_TOKEN_SECRET
    })
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: envConfig.REFRESH_TOKEN_SECRET
    })
  }
  veryfyAccessTokenToGuestOrUser(
    token: string
  ): Promise<AccessTokenPayload | GuestAccessTokenPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: envConfig.ACCESS_TOKEN_SECRET
    })
  }
}
