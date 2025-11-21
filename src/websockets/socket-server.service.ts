import { Injectable } from '@nestjs/common'
import { Server, Socket } from 'socket.io'

@Injectable()
export class SocketServerService {
  public server: Server | null = null
  private userSocketMap = new Map<number, string>()
  /**
   * Thêm hoặc cập nhật ánh xạ từ userId tới socketId.
   * Đây là socketId của kết nối hiện tại.
   */
  addSocket(userId: number, socketId: string): void {
    this.userSocketMap.set(userId, socketId)
  }

  /**
   * Lấy đối tượng Socket.IO (bao gồm cả socket.data) dựa trên userId.
   */
  getSocket(userId: number): Socket | undefined {
    if (!this.server) {
      // Trường hợp server chưa được khởi tạo
      return undefined
    }
    const socketId = this.userSocketMap.get(userId)
    if (socketId) {
      // Sử dụng server.sockets.sockets để tìm Socket object theo ID
      return this.server.sockets.sockets.get(socketId)
    }
    return undefined
  }

  /**
   * Lấy ngôn ngữ ưa thích (lang) của người dùng từ socket.data.
   * Mặc định là 'vi' nếu không tìm thấy.
   */
  getLangByUserId(userId: number): string {
    const socket = this.getSocket(userId)
    // Giả định bạn đã lưu ngôn ngữ vào socket.data.lang trong Adapter
    return socket?.data.lang || 'vi'
  }

  /**
   * Xóa ánh xạ khi người dùng ngắt kết nối hoặc đăng xuất.
   */
  removeSocket(userId: number): void {
    this.userSocketMap.delete(userId)
  }
}
