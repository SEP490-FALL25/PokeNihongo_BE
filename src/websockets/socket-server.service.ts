import { Injectable, Logger } from '@nestjs/common'
import { Server, Socket } from 'socket.io'

@Injectable()
export class SocketServerService {
  private readonly logger = new Logger(SocketServerService.name)
  public server: Server | null = null
  private userSocketMap = new Map<number, string>()
  /**
   * Thêm hoặc cập nhật ánh xạ từ userId tới socketId.
   * Đây là socketId của kết nối hiện tại.
   */
  addSocket(userId: number, socketId: string): void {
    const prev = this.userSocketMap.get(userId)
    this.logger.debug(
      `[SocketServerService] addSocket userId=${userId}, socketId=${socketId}, prevSocketId=${prev}`
    )
    this.userSocketMap.set(userId, socketId)
  }

  /**
   * Lấy đối tượng Socket.IO (bao gồm cả socket.data) dựa trên userId.
   */
  getSocket(userId: number): Socket | undefined {
    if (!this.server) {
      // Trường hợp server chưa được khởi tạo
      this.logger.warn(
        `[SocketServerService] getSocket userId=${userId} but server is null`
      )
      return undefined
    }
    const socketId = this.userSocketMap.get(userId)
    if (socketId) {
      // Sử dụng server.sockets.sockets để tìm Socket object theo ID
      let socket = this.server.sockets.sockets.get(socketId)

      // Nếu không tìm thấy ở default namespace, thử duyệt các namespace khác
      if (!socket) {
        const nspMap: Map<string, any> = (this.server as any)._nsps
        if (nspMap && nspMap.size > 0) {
          for (const [nspName, nsp] of nspMap.entries()) {
            const maybeSocket = nsp.sockets.get(socketId)
            if (maybeSocket) {
              socket = maybeSocket as Socket
              this.logger.debug(
                `[SocketServerService] getSocket found socket in namespace ${nspName} for userId=${userId}`
              )
              break
            }
          }
        }
      }

      if (!socket) {
        this.logger.warn(
          `[SocketServerService] getSocket userId=${userId} mapping socketId=${socketId} but socket not found in any namespace`
        )
      }
      return socket
    }
    this.logger.warn(`[SocketServerService] getSocket userId=${userId} has no mapping`)
    return undefined
  }

  /**
   * Lấy ngôn ngữ ưa thích (lang) của người dùng từ socket.data.
   * Mặc định là 'vi' nếu không tìm thấy.
   */
  getLangByUserId(userId: number): string {
    const socket = this.getSocket(userId)
    const lang = socket?.data.lang || 'vi'
    this.logger.debug(
      `[SocketServerService] getLangByUserId userId=${userId}, socketId=${socket?.id}, lang=${lang}`
    )
    return lang
  }

  /**
   * Xóa ánh xạ khi người dùng ngắt kết nối hoặc đăng xuất.
   */
  removeSocket(userId: number): void {
    const prev = this.userSocketMap.get(userId)
    this.logger.debug(
      `[SocketServerService] removeSocket userId=${userId}, prevSocketId=${prev}`
    )
    this.userSocketMap.delete(userId)
  }
}
