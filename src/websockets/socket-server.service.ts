import { Injectable } from '@nestjs/common'
import { Server } from 'socket.io'

@Injectable()
export class SocketServerService {
  public server: Server | null = null
}
