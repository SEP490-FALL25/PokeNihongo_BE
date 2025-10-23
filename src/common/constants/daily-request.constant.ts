export const DailyConditionType = {
  LOGIN: 'LOGIN',
  COMPLETE_LESSON: 'COMPLETE_LESSON',
  EXCERCISE: 'EXCERCISE',
  STREAK_LOGIN: 'STREAK_LOGIN',
  STREAK_COMPLETE_LESSON: 'STREAK_COMPLETE_LESSON',
  STREAK_EXERCISE: 'STREAK_EXERCISE'
} as const
export type DailyConditionType =
  (typeof DailyConditionType)[keyof typeof DailyConditionType]
