export const NotificationType = {
  REWARD: 'REWARD',
  LESSON: 'LESSON',
  EXERCISE: 'EXERCISE',
  ACHIEVEMENT: 'ACHIEVEMENT',
  SEASON: 'SEASON',
  LEVEL: 'LEVEL',
  SYSTEM: 'SYSTEM',
  OTHER: 'OTHER'
} as const

export type NotificationTypeType =
  (typeof NotificationType)[keyof typeof NotificationType]
