export const AchievementTierType = {
  BASIC: 'BASIC',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  MASTER: 'MASTER'
} as const

export type AchievementTierTypeType = keyof typeof AchievementTierType

export const AchievementType = {
  COMPLETE_LESSON: 'COMPLETE_LESSON',
  CHOOSE_STARTER_POKEMON: 'CHOOSE_STARTER_POKEMON',
  PLACEMENT_TEST_DONE: 'PLACEMENT_TEST_DONE',
  LEARNING_STREAK: 'LEARNING_STREAK',
  CAPTURE_POKEMON_COUNT: 'CAPTURE_POKEMON_COUNT',
  CAPTURE_TYPE_COLLECTION: 'CAPTURE_TYPE_COLLECTION',
  CAPTURE_ALL_POKEMON: 'CAPTURE_ALL_POKEMON',
  CAPTURE_LEGENDARY: 'CAPTURE_LEGENDARY',
  EVOLVE_POKEMON_FINAL: 'EVOLVE_POKEMON_FINAL'
} as const

export type AchievementTypeType = keyof typeof AchievementType

export const dailyRequestType = {
  DAILY_LOGIN: 'DAILY_LOGIN',
  DAILY_LESSON: 'DAILY_LESSON',
  DAILY_EXERCISE: 'DAILY_EXERCISE',
  STREAK_LOGIN: 'STREAK_LOGIN',
  STREAK_LESSON: 'STREAK_LESSON',
  STREAK_EXCERCISE: 'STREAK_EXCERCISE'
} as const

export type DailyRequestTypeType = keyof typeof dailyRequestType

export const categoryType = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY'
} as const
export type CategoryTypeType = keyof typeof categoryType

export const UserAchievementStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED_NOT_CLAIMED: 'COMPLETED_NOT_CLAIMED',
  CLAIMED: 'CLAIMED'
} as const

export type UserAchievementStatusType = keyof typeof UserAchievementStatus
