import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { TokenService } from '@/shared/services/token.service'
import { Injectable, Logger } from '@nestjs/common'
import {
  ConnectedSocket,
  MessageBody,
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
  endTime: Date
}

interface ParticipantData {
  id: number
  hasAccepted: boolean
  userId: number
  matchId: number
}

@WebSocketGateway({
  namespace: '/matching'
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
  @SubscribeMessage(MATCHING_EVENTS.JOIN_SEARCHING_ROOM)
  handleJoinSearchingRoom(@ConnectedSocket() client: Socket): void {
    const userId = client.data?.userId

    if (!userId) {
      this.logger.warn(
        `[MatchingGateway] Client ${client.id} missing userId in socket.data; unauthorized`
      )
      return
    }

    const roomName = SOCKET_ROOM.getMatchingRoomByUserId(userId)
    client.join(roomName)

    this.logger.debug(
      `[MatchingGateway] Client ${client.id} joined room ${roomName} for user ${userId}`
    )
  }

  /**
   * Handle user leaving matching room
   */
  @SubscribeMessage(MATCHING_EVENTS.LEAVE_SEARCHING_ROOM)
  handleLeaveSearchingRoom(@ConnectedSocket() client: Socket): void {
    const userId = client.data?.userId

    if (!userId) {
      this.logger.warn(
        `[MatchingGateway] Client ${client.id} missing userId in socket.data; unauthorized`
      )
      return
    }

    const roomName = SOCKET_ROOM.getMatchingRoomByUserId(userId)
    client.leave(roomName)

    this.logger.debug(
      `[MatchingGateway] Client ${client.id} left room ${roomName} for user ${userId}`
    )
  }

  /**
   * Gửi notification cho 1 user cụ thể
   */
  notifyUser(userId: number, payload: MatchingEventPayload): void {
    const roomName = SOCKET_ROOM.getMatchingRoomByUserId(userId)
    console.log('roomName: ', roomName)

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
          createdAt: match.createdAt,
          endTime: match.endTime
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
          createdAt: match.createdAt,
          endTime: match.endTime
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

  /**
   * Gửi notification khi Pokemon được chọn
   * Emits to the match room (matching_{matchId}) so both users receive updates
   * Data follows GetMatchRoundDetailForUserResSchema format
   */
  notifyPokemonSelected(
    matchId: number,
    matchRoundId: number,
    data: {
      match: {
        id: number
        status: string
        participants: Array<{
          id: number
          userId: number
          user: {
            id: number
            name: string
            email: string
            eloscore: number
            avatar: string | null
          }
        }>
      }
      rounds: Array<{
        id: number
        roundNumber: string
        status: string
        endTimeRound: Date | null
        participants: Array<{
          id: number
          matchParticipantId: number
          orderSelected: number
          endTimeSelected: Date | null
          selectedUserPokemonId: number | null
          selectedUserPokemon: {
            id: number
            userId: number
            pokemonId: number
            pokemon: {
              id: number
              pokedex_number: number
              nameJp: string
              nameTranslations: any
              imageUrl: string | null
              rarity: string
            } | null
          } | null
        }>
      }>
    },
    participant: any,
    opponent: any
  ): void {
    const room = SOCKET_ROOM.getMatchRoom(matchId)

    const payload = {
      type: 'POKEMON_SELECTED',
      matchId,
      matchRoundId,
      data
    }

    this.server.to(room).emit(MATCHING_EVENTS.SELECT_POKEMON, payload)

    this.logger.log(
      `[MatchingGateway] Notified room ${room} about Pokemon selection in match ${matchId}, round ${matchRoundId}`
    )
  }

  /**
   * Join match room
   * Both users in the match join the same room using matchId
   * This allows real-time updates for Pokemon selection to both players across all rounds
   */
  @SubscribeMessage(MATCHING_EVENTS.JOIN_MATCHING_ROOM)
  handleJoinMatchRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { matchId: number }
  ): void {
    const userId = client.data.userId

    if (!userId || !payload.matchId) {
      this.logger.warn(
        `[MatchingGateway] Invalid join-match-room request from socket ${client.id}`
      )
      return
    }

    // Both users join the same room using matchId with pattern: matching_{matchId}
    const room = SOCKET_ROOM.getMatchRoom(payload.matchId)
    client.join(room)

    this.logger.log(`[MatchingGateway] User ${userId} joined shared match room: ${room}`)
  }

  /**
   * Leave match room
   * User leaves the shared room when they're done with the match
   */
  @SubscribeMessage(MATCHING_EVENTS.LEAVE_MATCHING_ROOM)
  handleLeaveMatchRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { matchId: number }
  ): void {
    const userId = client.data.userId

    if (!userId || !payload.matchId) {
      this.logger.warn(
        `[MatchingGateway] Invalid leave-match-room request from socket ${client.id}`
      )
      return
    }

    const room = SOCKET_ROOM.getMatchRoom(payload.matchId)
    client.leave(room)

    this.logger.log(`[MatchingGateway] User ${userId} left shared match room: ${room}`)
  }
}
