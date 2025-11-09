export const LeaderboardStatus = {
  INACTIVE: 'INACTIVE',
  PREVIEW: 'PREVIEW',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED'
} as const
export type LeaderboardStatus = (typeof LeaderboardStatus)[keyof typeof LeaderboardStatus]
