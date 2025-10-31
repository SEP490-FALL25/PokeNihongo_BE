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
          const { authorization } = socket.handshake.auth
          if (!authorization) throw MissingTokenException

          const token = authorization.split(' ')[1]
          if (!token) throw MissingTokenException

          const user = await this.tokenService.veryfyAccessTokenToGuestOrUser(token)

          //Guard check user
          const isUser = (payload: any): payload is AccessTokenPayload =>
            payload && 'userId' in payload && 'roleId' in payload

          if (isUser(user)) {
            // cho vao homepage room
            const homePageRoom = ROOM_SOCKET.HOME_PAGE
            socket.join(homePageRoom)
          } else {
            throw InvalidTokenException
          }

          next()
        } catch (err) {
          next(new UnauthorizedException())
        }
      })()
    }

    ;['/'].forEach((namespace) => {
      server.of(namespace).use(authMiddleware)
    })
    return server
  }
}
