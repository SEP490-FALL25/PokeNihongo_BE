import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets'
import { Server } from 'socket.io'
import { SocketServerService } from './socket-server.service'

@WebSocketGateway()
export class InitializerGateway implements OnGatewayInit {
  constructor(private readonly socketServerService: SocketServerService) {}

  afterInit(server: Server) {
    this.socketServerService.server = server
    console.log('Socket.IO server initialized')
  }
}
