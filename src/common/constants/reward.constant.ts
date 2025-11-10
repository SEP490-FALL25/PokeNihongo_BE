export const RewardType = {
  LESSON: 'LESSON',
  DAILY_REQUEST: 'DAILY_REQUEST',
  EVENT: 'EVENT',
  ACHIEVEMENT: 'ACHIEVEMENT',
  LEVEL: 'LEVEL'
} as const

export const RewardItem = {
  ADD_EXP: 'ADD_EXP',
  ADD_POINT: 'ADD_POINT',
  GIVE_POKEMON: 'GIVE_POKEMON',
  UNLOCK_FEATURE: 'UNLOCK_FEATURE'
} as const

export const RewardTarget = {
  EXP: 'EXP',
  POKEMON: 'POKEMON',
  POKE_COINS: 'POKE_COINS',
  SPARKLES: 'SPARKLES'
} as const

export const RewardClaimStatus = {
  PENDING: 'PENDING',
  CLAIMED: 'CLAIMED',
  COMPLETED: 'COMPLETED'
} as const

export type RewardClaimStatusType =
  (typeof RewardClaimStatus)[keyof typeof RewardClaimStatus]
