export const DailyConditionType = {
  LOGIN: 'LOGIN',
  COMPLETE_LESSON: 'COMPLETE_LESSON',
  STREAK_LOGIN: 'STREAK_LOGIN'
} as const
export type DailyConditionType =
  (typeof DailyConditionType)[keyof typeof DailyConditionType]
