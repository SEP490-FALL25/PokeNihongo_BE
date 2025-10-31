import { Module } from '@nestjs/common'
import { InitializerGateway } from './initializer.gateway'
import { SocketServerService } from './socket-server.service'
import { WebsocketsService } from './websockets.service'

@Module({
  providers: [WebsocketsService, SocketServerService, InitializerGateway],
  exports: [WebsocketsService, SocketServerService]
})
export class WebsocketsModule {}
