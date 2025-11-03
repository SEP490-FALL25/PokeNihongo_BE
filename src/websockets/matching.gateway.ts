import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { TokenService } from '@/shared/services/token.service'
import { Injectable, Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import {
  MatchFoundPayload,
  MATCHING_EVENTS,
  MatchingEventPayload,
  MatchStatusUpdatePayload,
  SOCKET_ROOM
} from '../common/constants/socket.constant'

interface MatchData {
  id: number
  status: string
  createdAt: Date
}

interface ParticipantData {
  id: number
  hasAccepted: boolean
  userId: number
  matchId: number
}

@WebSocketGateway({
  namespace: 'matching'
})
@Injectable()
export class MatchingGateway {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(MatchingGateway.name)

  constructor(
    private readonly sharedUserRepo: SharedUserRepository,
    private readonly tokenService: TokenService
  ) {}

  /**
   * Handle user joining matching room
   * userId is extracted from verified token in socket.data (set by adapter)
   */
  @SubscribeMessage(MATCHING_EVENTS.JOIN_MATCHING_ROOM)
  handleJoinMatchingRoom(@ConnectedSocket() client: Socket): void {
    const userId = client.data?.userId
    console.log(client.data)

    if (!userId) {
      this.logger.warn(
        `[MatchingGateway] Client ${client.id} missing userId in socket.data; unauthorized`
      )
      return
    }

    const roomName = SOCKET_ROOM.getMatchingRoom(userId)
    client.join(roomName)

    this.logger.debug(
      `[MatchingGateway] Client ${client.id} joined room ${roomName} for user ${userId}`
    )
  }

  /**
   * Handle user leaving matching room
   */
  @SubscribeMessage(MATCHING_EVENTS.LEAVE_MATCHING_ROOM)
  handleLeaveMatchingRoom(@ConnectedSocket() client: Socket): void {
    const userId = client.data?.userId

    if (!userId) {
      this.logger.warn(
        `[MatchingGateway] Client ${client.id} missing userId in socket.data; unauthorized`
      )
      return
    }

    const roomName = SOCKET_ROOM.getMatchingRoom(userId)
    client.leave(roomName)

    this.logger.debug(
      `[MatchingGateway] Client ${client.id} left room ${roomName} for user ${userId}`
    )
  }

  /**
   * Gửi notification cho 1 user cụ thể
   */
  notifyUser(userId: number, payload: MatchingEventPayload): void {
    const roomName = SOCKET_ROOM.getMatchingRoom(userId)
    this.server.to(roomName).emit(MATCHING_EVENTS.MATCHING_EVENT, payload)

    this.logger.debug(
      `[MatchingGateway] Sent ${payload.type} to user ${userId} in room ${roomName}`
    )
  }

  /**
   * Gửi notification cho nhiều users
   */
  notifyUsers(userIds: number[], payload: MatchingEventPayload): void {
    userIds.forEach((userId) => this.notifyUser(userId, payload))
  }

  /**
   * Gửi notification match found cho 2 users với full data
   * Enhanced version: accepts full match, participant, and user data
   */
  async notifyMatchFoundEnhanced(
    match: MatchData,
    participant1: ParticipantData,
    participant2: ParticipantData
  ): Promise<void> {
    try {
      // Fetch user details for both users
      const [user1, user2] = await Promise.all([
        this.sharedUserRepo.findUnique({ id: participant1.userId }),
        this.sharedUserRepo.findUnique({ id: participant2.userId })
      ])

      if (!user1 || !user2) {
        this.logger.error(
          `[MatchingGateway] User not found: user1=${user1?.id}, user2=${user2?.id}`
        )
        return
      }

      // Create payload for user 1 (opponent is user 2)
      const payload1: MatchFoundPayload = {
        type: 'MATCH_FOUND',
        matchId: match.id,
        match: {
          id: match.id,
          status: match.status,
          createdAt: match.createdAt
        },
        opponent: {
          id: user2.id,
          name: user2.name,
          avatar: user2.avatar
        },
        participant: {
          id: participant1.id,
          hasAccepted: participant1.hasAccepted,
          userId: participant1.userId,
          matchId: participant1.matchId
        }
      }

      // Create payload for user 2 (opponent is user 1)
      const payload2: MatchFoundPayload = {
        type: 'MATCH_FOUND',
        matchId: match.id,
        match: {
          id: match.id,
          status: match.status,
          createdAt: match.createdAt
        },
        opponent: {
          id: user1.id,
          name: user1.name,
          avatar: user1.avatar
        },
        participant: {
          id: participant2.id,
          hasAccepted: participant2.hasAccepted,
          userId: participant2.userId,
          matchId: participant2.matchId
        }
      }

      // Send to both users
      this.notifyUser(user1.id, payload1)
      this.notifyUser(user2.id, payload2)

      this.logger.log(
        `[MatchingGateway] Enhanced notification sent to users ${user1.id} (${user1.name}) and ${user2.id} (${user2.name}) about match ${match.id}`
      )
    } catch (error) {
      this.logger.error(
        `[MatchingGateway] Error in notifyMatchFoundEnhanced: ${error.message}`,
        error.stack
      )
    }
  }

  /**
   * Gửi notification match found cho 2 users (legacy - will be enhanced)
   * TODO: This will be replaced with enhanced version that includes full match/user data
   */
  notifyMatchFound(userId1: number, userId2: number, matchId: number): void {
    // Temporary: Send basic data (will be enhanced in next step)
    this.notifyUser(userId1, {
      type: 'MATCH_FOUND',
      matchId,
      match: {
        id: matchId,
        status: 'PENDING',
        createdAt: new Date()
      },
      opponent: {
        id: userId2,
        name: 'Unknown', // Will be fetched in enhancement
        avatar: null
      },
      participant: {
        id: 0, // Will be fetched in enhancement
        hasAccepted: false,
        userId: userId1,
        matchId
      }
    })

    // Send to user 2
    this.notifyUser(userId2, {
      type: 'MATCH_FOUND',
      matchId,
      match: {
        id: matchId,
        status: 'PENDING',
        createdAt: new Date()
      },
      opponent: {
        id: userId1,
        name: 'Unknown', // Will be fetched in enhancement
        avatar: null
      },
      participant: {
        id: 0, // Will be fetched in enhancement
        hasAccepted: false,
        userId: userId2,
        matchId
      }
    })

    this.logger.log(
      `[MatchingGateway] Notified users ${userId1} and ${userId2} about match ${matchId}`
    )
  }

  /**
   * Gửi notification matchmaking failed
   */
  notifyMatchmakingFailed(userId: number, reason: string): void {
    this.notifyUser(userId, {
      type: 'MATCHMAKING_FAILED',
      reason
    })

    this.logger.log(
      `[MatchingGateway] Notified user ${userId} about matchmaking failure: ${reason}`
    )
  }

  /**
   * Gửi notification match status update
   */
  notifyMatchStatusUpdate(
    userIds: number[],
    matchId: number,
    status: string,
    message?: string
  ): void {
    const payload: MatchStatusUpdatePayload = {
      type: 'MATCH_STATUS_UPDATE',
      matchId,
      status,
      message
    }

    this.notifyUsers(userIds, payload)

    this.logger.log(
      `[MatchingGateway] Notified users ${userIds.join(', ')} about match ${matchId} status: ${status}`
    )
  }
}
