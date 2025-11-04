// ========== MATCHING SOCKET TYPES ==========
export interface MatchFoundPayload {
  type: 'MATCH_FOUND'
  matchId: number
  match: {
    id: number
    status: string
    createdAt: Date
    endTime?: Date
  }
  opponent: {
    id: number
    name: string
    avatar: string | null
  }
  participant: {
    id: number
    hasAccepted: boolean
    userId: number
    matchId: number
  }
}

export interface MatchmakingFailedPayload {
  type: 'MATCHMAKING_FAILED'
  reason: string
}

export interface MatchStatusUpdatePayload {
  type: 'MATCH_STATUS_UPDATE'
  matchId: number
  status: string
  message?: string
}

export interface PokemonSelectedPayload {
  type: 'POKEMON_SELECTED'
  matchRoundId: number
  matchRound: any
  participant: any
  opponent: any
}

export type MatchingEventPayload =
  | MatchFoundPayload
  | MatchmakingFailedPayload
  | MatchStatusUpdatePayload
  | PokemonSelectedPayload

// ========== SOCKET EVENTS ==========
export const MATCHING_EVENTS = {
  // Server -> Client events
  MATCHING_EVENT: 'matching-event',

  // Client -> Server events
  JOIN_MATCHING_ROOM: 'join-matching-room',
  LEAVE_MATCHING_ROOM: 'leave-matching-room'
} as const

// ========== SOCKET ROOMS ==========
export const SOCKET_ROOM = {
  /**
   * Get matching room name for a user
   * Pattern: matching_{userId}
   */
  getMatchingRoom: (userId: number): string => `matching_${userId}`,

  /**
   * Get match round room name
   * Pattern: match_round_{matchRoundId}
   */
  getMatchRoundRoom: (matchRoundId: number): string => `match_round_${matchRoundId}`,

  /**
   * Get user room name (legacy pattern)
   * Pattern: user:{userId}
   */
  getUserRoom: (userId: number): string => `user:${userId}`
} as const

export const SOCKET_EVENT = {}
