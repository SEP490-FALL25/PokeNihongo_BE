import { KaiwaGateway } from '@/websockets/kaiwa.gateway'
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
    MatchingGateway,
    KaiwaGateway
  ],
  exports: [WebsocketsService, SocketServerService, MatchingGateway, KaiwaGateway]
})
export class WebsocketsModule {}
