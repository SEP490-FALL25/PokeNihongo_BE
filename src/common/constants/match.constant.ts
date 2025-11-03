export const MatchStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const

export type MatchStatusType = (typeof MatchStatus)[keyof typeof MatchStatus]

export const MatchRoundNumber = {
  ONE: 'ONE',
  TWO: 'TWO',
  THREE: 'THREE'
} as const

export type MatchRoundNumberType =
  (typeof MatchRoundNumber)[keyof typeof MatchRoundNumber]

export const RoundStatus = {
  SELECTING_POKEMON: 'SELECTING_POKEMON',
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
} as const

export type RoundStatusType = (typeof RoundStatus)[keyof typeof RoundStatus]

export const MatchRoundParticipantStatus = {
  SELECTING_POKEMON: 'SELECTING_POKEMON',
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
} as const
export type MatchRoundParticipantStatusType =
  (typeof MatchRoundParticipantStatus)[keyof typeof MatchRoundParticipantStatus]
