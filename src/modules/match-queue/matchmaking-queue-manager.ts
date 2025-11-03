/**
 * Quản lý in-memory queue cho matchmaking
 * Mỗi user trong queue sẽ có:
 * - userId, baseElo
 * - joinTime (thời điểm vào queue)
 * - currentMinElo, currentMaxElo (range tăng dần theo time)
 */

export interface QueueEntry {
  userId: number
  baseElo: number
  joinTime: Date
  currentMinElo: number
  currentMaxElo: number
  hasReachedMaxRange: boolean // Đã đạt range tối đa chưa
  maxRangeReachedAt: Date | null // Thời điểm đạt max range
}

export class MatchmakingQueueManager {
  private queue: Map<number, QueueEntry> = new Map()

  private readonly INITIAL_RANGE_PERCENT = 0.1 // 10% ban đầu
  private readonly RANGE_INCREASE_PERCENT = 0.1 // Tăng 10% mỗi 5s
  private readonly RANGE_UPDATE_INTERVAL = 5000 // 5 giây
  private readonly MAX_ELO = 3000
  private readonly MIN_ELO = 0
  private readonly TIMEOUT_AFTER_MAX_RANGE = 50000 // 10 giây sau khi đạt max

  /**
   * Thêm user vào queue
   */
  addUser(userId: number, elo: number): void {
    if (this.queue.has(userId)) {
      return // User đã trong queue
    }

    const initialRange = elo * this.INITIAL_RANGE_PERCENT
    const entry: QueueEntry = {
      userId,
      baseElo: elo,
      joinTime: new Date(),
      currentMinElo: Math.max(this.MIN_ELO, elo - initialRange),
      currentMaxElo: Math.min(this.MAX_ELO, elo + initialRange),
      hasReachedMaxRange: false,
      maxRangeReachedAt: null
    }

    this.queue.set(userId, entry)
  }

  /**
   * Xóa user khỏi queue
   */
  removeUser(userId: number): void {
    this.queue.delete(userId)
  }

  /**
   * Lấy tất cả users trong queue
   */
  getAllUsers(): QueueEntry[] {
    return Array.from(this.queue.values())
  }

  /**
   * Cập nhật range ELO cho tất cả users dựa vào thời gian
   */
  updateRanges(): void {
    const now = new Date()

    this.queue.forEach((entry) => {
      const timeInQueue = now.getTime() - entry.joinTime.getTime()
      const intervals = Math.floor(timeInQueue / this.RANGE_UPDATE_INTERVAL)

      if (intervals === 0) return // Chưa đến lần cập nhật đầu tiên

      // Tính range hiện tại
      const currentRangePercent =
        this.INITIAL_RANGE_PERCENT + intervals * this.RANGE_INCREASE_PERCENT
      const range = entry.baseElo * currentRangePercent

      const newMin = Math.max(this.MIN_ELO, entry.baseElo - range)
      const newMax = Math.min(this.MAX_ELO, entry.baseElo + range)

      entry.currentMinElo = newMin
      entry.currentMaxElo = newMax

      // Kiểm tra đã đạt max range chưa
      if (
        !entry.hasReachedMaxRange &&
        (newMin === this.MIN_ELO || newMax === this.MAX_ELO)
      ) {
        entry.hasReachedMaxRange = true
        entry.maxRangeReachedAt = now
      }
    })
  }

  /**
   * Lấy danh sách users cần kick (timeout sau khi đạt max range)
   */
  getUsersToKick(): number[] {
    const now = new Date()
    const toKick: number[] = []

    this.queue.forEach((entry) => {
      if (
        entry.hasReachedMaxRange &&
        entry.maxRangeReachedAt &&
        now.getTime() - entry.maxRangeReachedAt.getTime() >= this.TIMEOUT_AFTER_MAX_RANGE
      ) {
        toKick.push(entry.userId)
      }
    })

    return toKick
  }

  /**
   * Tìm cặp users có range ELO overlap
   * Trả về [userId1, userId2] hoặc null
   */
  findMatch(): [number, number] | null {
    const users = this.getAllUsers()

    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const user1 = users[i]
        const user2 = users[j]

        // Kiểm tra range có overlap không
        const overlap =
          (user1.currentMinElo <= user2.baseElo &&
            user2.baseElo <= user1.currentMaxElo) ||
          (user2.currentMinElo <= user1.baseElo && user1.baseElo <= user2.currentMaxElo)

        if (overlap) {
          return [user1.userId, user2.userId]
        }
      }
    }

    return null
  }

  /**
   * Lấy số lượng users trong queue
   */
  getQueueSize(): number {
    return this.queue.size
  }
}
