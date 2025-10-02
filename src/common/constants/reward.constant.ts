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
  POINT: 'POINT',
  POKEMON: 'POKEMON',
  BADGE: 'BADGE',
  VOUCHER: 'VOUCHER'
} as const
