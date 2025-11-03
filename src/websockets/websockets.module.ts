import { Module } from '@nestjs/common'
import { InitializerGateway } from './initializer.gateway'
import { MatchingGateway } from './matching.gateway'
import { SocketServerService } from './socket-server.service'
import { WebsocketsService } from './websockets.service'

@Module({
  providers: [
    WebsocketsService,
    SocketServerService,
    InitializerGateway,
    MatchingGateway
  ],
  exports: [WebsocketsService, SocketServerService, MatchingGateway]
})
export class WebsocketsModule {}
