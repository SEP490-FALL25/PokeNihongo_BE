import { ROOM_SOCKET } from '@/common/constants/event-socket.constant'
import { TokenService } from '@/shared/services/token.service'
import { AccessTokenPayload } from '@/shared/types/jwt.type'
import { INestApplicationContext, Logger, UnauthorizedException } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { Server, Socket } from 'socket.io'
import { SocketServerService } from './socket-server.service'
import { InvalidTokenException, MissingTokenException } from './websocket.error'

export class WebsocketAdapter extends IoAdapter {
  private readonly logger = new Logger(WebsocketAdapter.name)
  private tokenService: TokenService
  public ioServer: Server
  private socketServerService: SocketServerService
  constructor(private app: INestApplicationContext) {
    super(app)
    this.tokenService = this.app.get(TokenService)
    this.socketServerService = this.app.get(SocketServerService)
  }

  createIOServer(port: number, options?: any): Server {
    const server = super.createIOServer(port, {
      cors: {
        origin: '*',
        credentials: true
      },
      ...options
    }) as Server

    this.ioServer = server
    this.socketServerService.server = server
    const authMiddleware = (socket: Socket, next: (err?: any) => void): void => {
      ;(async () => {
        try {
          const { authorization, 'Accept-Language': acceptLanguage } =
            socket.handshake.auth
          if (!authorization) throw MissingTokenException
          this.logger.debug(`[WebsocketAdapter] Authorization header: ${authorization}`)
          this.logger.debug(
            `[WebsocketAdapter] Accept-Language header: ${acceptLanguage}`
          )
          // Handle both "Bearer token" and "token" formats
          let token: string
          if (authorization.startsWith('Bearer ')) {
            token = authorization.split(' ')[1]
          } else {
            token = authorization
          }

          if (!token) throw MissingTokenException

          const user = await this.tokenService.veryfyAccessTokenToGuestOrUser(token)
          //Guard check user
          const isUser = (payload: any): payload is AccessTokenPayload =>
            payload && 'userId' in payload && 'roleId' in payload

          if (isUser(user)) {
            this.logger.debug(
              `[WebsocketAdapter] User verified: userId=${user.userId}, roleId=${user.roleId}`
            )

            // Store user info in socket.data for use in gateways
            socket.data.userId = user.userId
            socket.data.roleId = user.roleId
            socket.data.deviceId = user.deviceId
            socket.data.lang = acceptLanguage || 'vi'
            // Lưu mapping userId -> socketId trong SocketServerService
            this.socketServerService.addSocket(user.userId, socket.id)
            // cho vao homepage room
            const homePageRoom = ROOM_SOCKET.HOME_PAGE
            socket.join(homePageRoom)
          } else {
            this.logger.warn(
              `[WebsocketAdapter] Invalid user payload - missing userId or roleId: ${JSON.stringify(user)}`
            )
            throw InvalidTokenException
          }

          next()
        } catch (err) {
          next(new UnauthorizedException())
        }
      })()
    }

    ;['/', '/matching', '/kaiwa', '/user'].forEach((namespace) => {
      server.of(namespace).use(authMiddleware)
    })
    return server
  }
}
