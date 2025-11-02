export const MatchStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED'
} as const

export type MatchStatusType = (typeof MatchStatus)[keyof typeof MatchStatus]
